import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  upsertById,
  removeById,
  rollbackUpsert,
  restoreDeleted,
  prepareTradeSave,
  prepareJournalSave,
  prepareNoteSave,
  mergeCloudSnapshot,
  byCreatedDesc,
  byJournalDateDesc,
} from '../src/lib/recordStore';
import { trade } from './fixtures';
import type { JournalEntry, Note } from '../src/types';

const ids = (l: { id: string }[]) => l.map((x) => x.id).join(',');

test('ekle / güncelle / sil ve sıralama', () => {
  const a = trade({ id: 'a', status: 'WIN', rr: 1, createdAt: 100 });
  const b = trade({ id: 'b', status: 'LOSS', rr: -1, createdAt: 200 });
  let list = upsertById([a], b, byCreatedDesc);
  assert.equal(ids(list), 'b,a');
  list = upsertById(list, { ...a, rr: 3 }, byCreatedDesc);
  assert.equal(list.length, 2);
  assert.equal(list.find((t) => t.id === 'a')!.rr, 3);
  assert.equal(ids(removeById(list, 'b')), 'a');
});

test('geri alma: yeni kayıt çıkar, düzenleme eski haline döner; silme geri alınırken çift kayıt olmaz', () => {
  const a = trade({ id: 'a', status: 'WIN', rr: 1, createdAt: 100 });
  const edited = { ...a, rr: 5 };
  assert.equal(rollbackUpsert([edited], 'a', a)[0].rr, 1);
  assert.equal(rollbackUpsert([edited], 'a', undefined).length, 0);
  assert.equal(restoreDeleted([], a, byCreatedDesc).length, 1);
  assert.equal(restoreDeleted([a], a, byCreatedDesc).length, 1);
  assert.equal(restoreDeleted([a], undefined).length, 1);
});

test('işlem kaydı: yeni kimlik ve zaman; düzenlemede birleşir, boşaltılan alan düşer', () => {
  const now = 1_000;
  const fresh = prepareTradeSave([], { asset: 'EURUSD', status: 'WIN', rr: 2 } as any, now, () => 'new1');
  assert.equal(fresh.isNew, true);
  assert.equal(fresh.trade.id, 'new1');
  assert.equal(fresh.trade.createdAt, now);

  const old = trade({ id: 'x', status: 'WIN', rr: 2, createdAt: 50, quickEntry: true, notes: 'eski' });
  const edit = prepareTradeSave([old], { id: 'x', rr: 3, quickEntry: undefined } as any, now, () => 'unused');
  assert.equal(edit.isNew, false);
  assert.equal(edit.previous, old);
  assert.equal(edit.trade.rr, 3);
  assert.equal(edit.trade.notes, 'eski'); // gönderilmeyen alan korunur
  assert.equal(edit.trade.createdAt, 50);
  assert.equal('quickEntry' in edit.trade, false); // bilerek boşaltılan alan düşer
});

test('günlük kaydı: sabit kimlikli kayıt ilk kez eklenince "yeni" sayılır; sonra oluşturulma zamanı korunur', () => {
  const first = prepareJournalSave([], { id: 'weekly-2026-10-19', date: '2026-10-19', title: 't', content: 'c' }, 10, () => 'x');
  assert.equal(first.isNew, true);
  assert.equal(first.entry.createdAt, 10);
  const second = prepareJournalSave([first.entry], { ...first.entry, content: 'd' }, 20, () => 'x');
  assert.equal(second.isNew, false);
  assert.equal(second.entry.createdAt, 10);
  assert.equal(second.entry.updatedAt, 20);
  const generated = prepareJournalSave([], { date: '2026-10-20', title: '', content: '' }, 5, () => 'gen');
  assert.equal(generated.entry.id, 'gen');
});

test('not kaydı: kimliksiz not yeni kimlik alır', () => {
  const n = prepareNoteSave([], { id: '', title: 'a', content: 'b', createdAt: 1, updatedAt: 1 } as Note, () => 'n1');
  assert.equal(n.isNew, true);
  assert.equal(n.note.id, 'n1');
});

test('günlük sıralaması tarih metniyle (saat dilimine bağlı değil), aynı günde son güncellenen önce', () => {
  const e = (id: string, date: string, updatedAt: number) => ({ id, date, updatedAt, createdAt: 0, title: '', content: '' }) as JournalEntry;
  const list = [e('a', '2026-10-19', 1), e('b', '2026-10-20', 1), e('c', '2026-10-20', 5)].sort(byJournalDateDesc);
  assert.equal(ids(list), 'c,b,a');
});

test('bulut birleştirme: ilk görüntüde yerel kayıtlar korunur ve yüklenir; sonra yalnızca yazımı süren kalır', () => {
  const cloud = [trade({ id: 'c', status: 'WIN', rr: 1, createdAt: 300 })];
  const local = [trade({ id: 'l', status: 'WIN', rr: 1, createdAt: 200 }), trade({ id: 'p', status: 'WIN', rr: 1, createdAt: 100 })];
  const first = mergeCloudSnapshot(cloud, local, { initial: true, pendingIds: new Set(), sort: byCreatedDesc });
  assert.equal(ids(first.list), 'c,l,p');
  assert.equal(ids(first.toUpload), 'l,p');
  // başka cihazda silinen "l" geri gelmez; yazımı süren "p" kalır
  const later = mergeCloudSnapshot(cloud, local, { initial: false, pendingIds: new Set(['p']), sort: byCreatedDesc });
  assert.equal(ids(later.list), 'c,p');
  assert.equal(later.toUpload.length, 0);
});

test('not / günlük okuma onarımı: bozuk kayıt atılır, eksik alan tamamlanır', async () => {
  const { normalizeNotes, normalizeJournals } = await import('../src/lib/recordStore');
  const notes = normalizeNotes([{ id: 'n1', title: 5, createdAt: 10 }, { title: 'kimliksiz' }, null, 'x']);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].title, '');
  assert.equal(notes[0].content, '');
  assert.equal(notes[0].updatedAt, 10);
  const js = normalizeJournals([
    { id: 'j1', date: '2026-10-19', mood: 'harika', tags: ['a', 3], weekly: { good: 'x' } },
    { id: 'j2', date: 'dün' },
  ]);
  assert.equal(js.length, 1);
  assert.equal(js[0].mood, undefined);
  assert.deepEqual(js[0].tags, ['a']);
  assert.deepEqual(js[0].weekly, { good: 'x', avoid: '', focus: '' });
});
