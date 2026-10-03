import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';

interface TurkishDateTimePickerProps {
  value: string; // "YYYY-MM-DDTHH:mm" format
  onChange: (value: string) => void;
  className?: string;
}

export const TURKISH_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const TURKISH_DAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export const TurkishDateTimePicker = React.memo(function TurkishDateTimePicker({ value, onChange, className = '' }: TurkishDateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'none' | 'hour' | 'minute'>('none');
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const hourDropdownRef = useRef<HTMLDivElement>(null);
  const minuteDropdownRef = useRef<HTMLDivElement>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Parse current value
  const parsedDate = React.useMemo(() => {
    if (!value) {
      return new Date();
    }
    const [datePart, timePart] = value.split('T');
    if (!datePart) return new Date();
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = (timePart || '12:00').split(':').map(Number);
    const d = new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [value]);

  const [viewYear, setViewYear] = useState(parsedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedDate.getMonth());

  // Sync view when value changes externally or when opened
  useEffect(() => {
    setViewYear(parsedDate.getFullYear());
    setViewMonth(parsedDate.getMonth());
  }, [value, isOpen]);

  // Position calculation for Portal & Viewport Boundaries
  const getCalculatedPosition = useCallback(() => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const popupWidth = Math.min(290, window.innerWidth - 20);
    const popupHeight = 360; // Estimated max height of the picker

    const spaceBelow = window.innerHeight - rect.bottom - 10;
    const spaceAbove = rect.top - 10;

    let top = 0;
    if (spaceBelow >= popupHeight || spaceBelow >= spaceAbove) {
      // Place below
      top = rect.bottom + 6;
      if (top + popupHeight > window.innerHeight - 8) {
        top = Math.max(8, window.innerHeight - popupHeight - 8);
      }
    } else {
      // Place above
      top = Math.max(8, rect.top - popupHeight - 6);
    }

    let left = rect.left;
    if (left + popupWidth > window.innerWidth - 10) {
      left = Math.max(10, window.innerWidth - popupWidth - 10);
    }
    if (left < 10) {
      left = 10;
    }

    return { top, left, width: popupWidth };
  }, []);

  // Compute position before paint
  useLayoutEffect(() => {
    if (!isOpen) return;
    const pos = getCalculatedPosition();
    if (pos) {
      setPopupPos(pos);
    }
  }, [isOpen, getCalculatedPosition]);

  // Sync position on open, scroll & resize
  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => {
      const pos = getCalculatedPosition();
      if (pos) {
        setPopupPos(pos);
      }
    };

    window.addEventListener('resize', handleUpdate, { passive: true });
    window.addEventListener('scroll', handleUpdate, { capture: true, passive: true });

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popupRef.current &&
        !popupRef.current.contains(target)
      ) {
        setIsOpen(false);
        setActiveDropdown('none');
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setActiveDropdown('none');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, getCalculatedPosition]);

  // Scroll active hour/minute into view when dropdown is opened
  useEffect(() => {
    if (activeDropdown === 'hour' && hourDropdownRef.current) {
      const selectedEl = hourDropdownRef.current.querySelector('[data-selected="true"]') as HTMLElement;
      if (selectedEl) {
        hourDropdownRef.current.scrollTop = selectedEl.offsetTop - 45;
      }
    } else if (activeDropdown === 'minute' && minuteDropdownRef.current) {
      const selectedEl = minuteDropdownRef.current.querySelector('[data-selected="true"]') as HTMLElement;
      if (selectedEl) {
        minuteDropdownRef.current.scrollTop = selectedEl.offsetTop - 45;
      }
    }
  }, [activeDropdown]);

  // Helper to format 2 digits
  const pad = (n: number) => n.toString().padStart(2, '0');

  // Format Turkish display: DD.MM.YYYY, HH:mm
  const displayFormatted = React.useMemo(() => {
    const day = pad(parsedDate.getDate());
    const month = pad(parsedDate.getMonth() + 1);
    const year = parsedDate.getFullYear();
    const hour = pad(parsedDate.getHours());
    const minute = pad(parsedDate.getMinutes());
    return `${day}.${month}.${year}, ${hour}:${minute}`;
  }, [parsedDate]);

  const updateDateTime = (newDate: Date) => {
    const year = newDate.getFullYear();
    const month = pad(newDate.getMonth() + 1);
    const day = pad(newDate.getDate());
    const hour = pad(newDate.getHours());
    const minute = pad(newDate.getMinutes());
    onChange(`${year}-${month}-${day}T${hour}:${minute}`);
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(v => v - 1);
    } else {
      setViewMonth(v => v - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(v => v + 1);
    } else {
      setViewMonth(v => v + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(parsedDate);
    newDate.setFullYear(viewYear);
    newDate.setMonth(viewMonth);
    newDate.setDate(day);
    updateDateTime(newDate);
    setActiveDropdown('none');
  };

  const handleHourSelect = (newHour: number) => {
    const safeHour = Math.max(0, Math.min(23, isNaN(newHour) ? 0 : newHour));
    const newDate = new Date(parsedDate);
    newDate.setHours(safeHour);
    updateDateTime(newDate);
    setActiveDropdown('none');
  };

  const handleMinuteSelect = (newMinute: number) => {
    const safeMinute = Math.max(0, Math.min(59, isNaN(newMinute) ? 0 : newMinute));
    const newDate = new Date(parsedDate);
    newDate.setMinutes(safeMinute);
    updateDateTime(newDate);
    setActiveDropdown('none');
  };

  const handleSetNow = () => {
    const now = new Date();
    updateDateTime(now);
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setActiveDropdown('none');
  };

  const handleSetToday = () => {
    const now = new Date();
    const newDate = new Date(parsedDate);
    newDate.setFullYear(now.getFullYear());
    newDate.setMonth(now.getMonth());
    newDate.setDate(now.getDate());
    updateDateTime(newDate);
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setActiveDropdown('none');
  };

  const handleSetYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const newDate = new Date(parsedDate);
    newDate.setFullYear(yesterday.getFullYear());
    newDate.setMonth(yesterday.getMonth());
    newDate.setDate(yesterday.getDate());
    updateDateTime(newDate);
    setViewYear(yesterday.getFullYear());
    setViewMonth(yesterday.getMonth());
    setActiveDropdown('none');
  };

  // Generate calendar days
  const calendarDays = React.useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    let startDay = firstDayOfMonth.getDay() - 1;
    if (startDay === -1) startDay = 6;

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{ day: number; isCurrentMonth: boolean; dateObj: Date }> = [];

    // Previous month padding
    for (let i = startDay - 1; i >= 0; i--) {
      const prevDay = daysInPrevMonth - i;
      days.push({
        day: prevDay,
        isCurrentMonth: false,
        dateObj: new Date(viewYear, viewMonth - 1, prevDay)
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        dateObj: new Date(viewYear, viewMonth, i)
      });
    }

    // Next month padding to fill complete weeks
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        dateObj: new Date(viewYear, viewMonth + 1, i)
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  const isToday = (date: Date) => {
    const now = new Date();
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    return (
      date.getDate() === parsedDate.getDate() &&
      date.getMonth() === parsedDate.getMonth() &&
      date.getFullYear() === parsedDate.getFullYear()
    );
  };

  const currentHours = parsedDate.getHours();
  const currentMinutes = parsedDate.getMinutes();

  const handleToggle = () => {
    if (!isOpen) {
      const pos = getCalculatedPosition();
      if (pos) {
        setPopupPos(pos);
      }
      setIsOpen(true);
      setActiveDropdown('none');
    } else {
      setIsOpen(false);
      setActiveDropdown('none');
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className || 'inline-block'}`}>
      {/* Input Display Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full h-9.5 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-700/70 hover:border-zinc-500 rounded-xl px-3 text-xs text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all font-sans font-bold flex items-center justify-between gap-3 cursor-pointer shadow-inner group"
      >
        <span className="tracking-wide truncate">{displayFormatted}</span>
        
        {/* Calendar Icon */}
        <div className="flex items-center text-zinc-400 group-hover:text-zinc-200 transition-colors">
          <CalendarIcon size={14} className="shrink-0" />
        </div>
      </button>

      {/* Dropdown Popup Portal */}
      {isOpen && popupPos && typeof document !== 'undefined' && createPortal(
        <div 
          ref={popupRef}
          onClick={(e) => {
            e.stopPropagation();
            if (activeDropdown !== 'none') {
              setActiveDropdown('none');
            }
          }}
          style={{
            position: 'fixed',
            top: `${popupPos.top}px`,
            left: `${popupPos.left}px`,
            width: `${popupPos.width}px`,
            zIndex: 99999,
          }}
          className="bg-zinc-900/98 border border-zinc-700/80 rounded-2xl p-3.5 shadow-2xl shadow-black/90 animate-in fade-in duration-100 select-none backdrop-blur-md"
        >
          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 mb-3 pb-2.5 border-b border-zinc-800/80">
            <button
              type="button"
              onClick={handleSetNow}
              className="flex-1 py-1 px-1.5 rounded-lg bg-zinc-950/80 hover:bg-zinc-800 text-[10px] font-medium text-blue-400 hover:text-blue-300 border border-zinc-700/40 hover:border-blue-500/30 transition-all cursor-pointer text-center"
            >
              Şimdi
            </button>
            <button
              type="button"
              onClick={handleSetToday}
              className="flex-1 py-1 px-1.5 rounded-lg bg-zinc-950/80 hover:bg-zinc-800 text-[10px] font-medium text-zinc-300 hover:text-zinc-100 border border-zinc-700/40 hover:border-zinc-600 transition-all cursor-pointer text-center"
            >
              Bugün
            </button>
            <button
              type="button"
              onClick={handleSetYesterday}
              className="flex-1 py-1 px-1.5 rounded-lg bg-zinc-950/80 hover:bg-zinc-800 text-[10px] font-medium text-zinc-300 hover:text-zinc-100 border border-zinc-700/40 hover:border-zinc-600 transition-all cursor-pointer text-center"
            >
              Dün
            </button>
          </div>

          {/* Month & Year Navigation */}
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold text-zinc-100 tracking-wide">
              {TURKISH_MONTHS[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700/50 rounded-xl p-0.5 shadow-xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-6.5 h-6.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 flex items-center justify-center transition-colors duration-150 cursor-pointer"
              >
                <ChevronLeft size={13} />
              </button>
              <div className="w-px h-3.5 bg-zinc-800" />
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-6.5 h-6.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 flex items-center justify-center transition-colors duration-150 cursor-pointer"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {TURKISH_DAYS_SHORT.map((day) => (
              <span key={day} className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {calendarDays.map((item, idx) => {
              const selected = isSelected(item.dateObj);
              const today = isToday(item.dateObj);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (item.isCurrentMonth) {
                      handleSelectDay(item.day);
                    } else {
                      setViewYear(item.dateObj.getFullYear());
                      setViewMonth(item.dateObj.getMonth());
                      const newDate = new Date(parsedDate);
                      newDate.setFullYear(item.dateObj.getFullYear());
                      newDate.setMonth(item.dateObj.getMonth());
                      newDate.setDate(item.day);
                      updateDateTime(newDate);
                    }
                  }}
                  className={`h-6.5 text-[10px] font-sans rounded-lg transition-all flex items-center justify-center relative cursor-pointer ${
                    selected
                      ? 'bg-blue-500/25 text-blue-300 border border-blue-500/40 font-bold shadow-xs'
                      : !item.isCurrentMonth
                      ? 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/30'
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80'
                  }`}
                >
                  <span>{item.day}</span>
                  {today && !selected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Simple, Clean & Custom-Themed Time Selector Row */}
          <div className="pt-2.5 border-t border-zinc-800/80 flex items-center justify-between gap-2 relative">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Clock size={12} className="text-zinc-400" />
              <span className="text-[11px] font-medium text-zinc-300">Saat</span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Custom Dark Hour Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdown(activeDropdown === 'hour' ? 'none' : 'hour');
                  }}
                  className={`h-7 px-2.5 bg-zinc-950 hover:bg-zinc-900 border rounded-lg text-xs font-sans font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs ${
                    activeDropdown === 'hour'
                      ? 'border-blue-500/60 text-blue-300 ring-1 ring-blue-500/30 bg-zinc-900'
                      : 'border-zinc-700/60 hover:border-zinc-500 text-zinc-100'
                  }`}
                >
                  <span>{pad(currentHours)}</span>
                  <ChevronDown size={11} className={`text-zinc-400 transition-transform duration-150 ${activeDropdown === 'hour' ? 'rotate-180 text-blue-400' : ''}`} />
                </button>

                {/* Custom Hour Scrollable Menu */}
                {activeDropdown === 'hour' && (
                  <div
                    ref={hourDropdownRef}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-full mb-1.5 left-0 w-20 max-h-40 overflow-y-auto bg-zinc-950 border border-zinc-700/90 rounded-xl p-1 shadow-2xl z-50 space-y-0.5"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(113, 113, 122, 0.45) rgba(24, 24, 27, 0.6)'
                    }}
                  >
                    {Array.from({ length: 24 }).map((_, h) => {
                      const isCurrent = h === currentHours;
                      return (
                        <button
                          key={h}
                          type="button"
                          data-selected={isCurrent}
                          onClick={() => handleHourSelect(h)}
                          className={`w-full py-1 text-center text-xs font-sans font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                            isCurrent
                              ? 'bg-blue-500/25 text-blue-300 font-bold border border-blue-500/40 shadow-xs'
                              : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
                          }`}
                        >
                          {pad(h)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <span className="text-xs font-sans font-bold text-zinc-500 select-none">:</span>

              {/* Custom Dark Minute Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdown(activeDropdown === 'minute' ? 'none' : 'minute');
                  }}
                  className={`h-7 px-2.5 bg-zinc-950 hover:bg-zinc-900 border rounded-lg text-xs font-sans font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs ${
                    activeDropdown === 'minute'
                      ? 'border-blue-500/60 text-blue-300 ring-1 ring-blue-500/30 bg-zinc-900'
                      : 'border-zinc-700/60 hover:border-zinc-500 text-zinc-100'
                  }`}
                >
                  <span>{pad(currentMinutes)}</span>
                  <ChevronDown size={11} className={`text-zinc-400 transition-transform duration-150 ${activeDropdown === 'minute' ? 'rotate-180 text-blue-400' : ''}`} />
                </button>

                {/* Custom Minute Scrollable Menu */}
                {activeDropdown === 'minute' && (
                  <div
                    ref={minuteDropdownRef}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-full mb-1.5 left-0 w-20 max-h-40 overflow-y-auto bg-zinc-950 border border-zinc-700/90 rounded-xl p-1 shadow-2xl z-50 space-y-0.5"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(113, 113, 122, 0.45) rgba(24, 24, 27, 0.6)'
                    }}
                  >
                    {Array.from({ length: 60 }).map((_, m) => {
                      const isCurrent = m === currentMinutes;
                      return (
                        <button
                          key={m}
                          type="button"
                          data-selected={isCurrent}
                          onClick={() => handleMinuteSelect(m)}
                          className={`w-full py-1 text-center text-xs font-sans font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                            isCurrent
                              ? 'bg-blue-500/25 text-blue-300 font-bold border border-blue-500/40 shadow-xs'
                              : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
                          }`}
                        >
                          {pad(m)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tamam / Kapat Butonu */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setActiveDropdown('none');
                }}
                className="ml-1 h-7 px-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <Check size={11} />
                <span>Tamam</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

interface TurkishDatePickerProps {
  value: string; // "YYYY-MM-DD" format
  onChange: (value: string) => void;
  className?: string;
  buttonClassName?: string;
  placeholder?: string;
  dropDirection?: 'up' | 'down';
  showPresets?: boolean;
}

export const TurkishDatePicker = React.memo(function TurkishDatePicker({
  value,
  onChange,
  className = '',
  buttonClassName = '',
  placeholder = 'Tarih Seçin',
  dropDirection,
  showPresets = true
}: TurkishDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Parse current value
  const parsedDate = React.useMemo(() => {
    if (!value) {
      return new Date();
    }
    const [year, month, day] = value.split('-').map(Number);
    const d = new Date(year, (month || 1) - 1, day || 1);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [value]);

  const [viewYear, setViewYear] = useState(parsedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedDate.getMonth());

  useEffect(() => {
    if (value) {
      const [year, month] = value.split('-').map(Number);
      if (year && month) {
        setViewYear(year);
        setViewMonth(month - 1);
      }
    }
  }, [value, isOpen]);

  // Viewport calculation
  const getCalculatedPosition = useCallback(() => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const popupWidth = Math.min(280, window.innerWidth - 20);
    const popupHeight = showPresets ? 310 : 270;

    const spaceBelow = window.innerHeight - rect.bottom - 10;
    const spaceAbove = rect.top - 10;

    let top = 0;
    if (dropDirection === 'up' && spaceAbove >= popupHeight) {
      top = Math.max(8, rect.top - popupHeight - 6);
    } else if (dropDirection === 'down' && spaceBelow >= popupHeight) {
      top = rect.bottom + 6;
    } else if (spaceBelow >= popupHeight || spaceBelow >= spaceAbove) {
      top = rect.bottom + 6;
      if (top + popupHeight > window.innerHeight - 8) {
        top = Math.max(8, window.innerHeight - popupHeight - 8);
      }
    } else {
      top = Math.max(8, rect.top - popupHeight - 6);
    }

    let left = rect.left;
    if (left + popupWidth > window.innerWidth - 10) {
      left = Math.max(10, window.innerWidth - popupWidth - 10);
    }
    if (left < 10) {
      left = 10;
    }

    return { top, left, width: popupWidth };
  }, [dropDirection, showPresets]);

  // Compute position before paint
  useLayoutEffect(() => {
    if (!isOpen) return;
    const pos = getCalculatedPosition();
    if (pos) {
      setPopupPos(pos);
    }
  }, [isOpen, getCalculatedPosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => {
      const pos = getCalculatedPosition();
      if (pos) {
        setPopupPos(pos);
      }
    };

    window.addEventListener('resize', handleUpdate, { passive: true });
    window.addEventListener('scroll', handleUpdate, { capture: true, passive: true });

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popupRef.current &&
        !popupRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, getCalculatedPosition]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  const displayFormatted = React.useMemo(() => {
    if (!value) return placeholder;
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return placeholder;
    return `${day}.${month}.${year}`;
  }, [value, placeholder]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(v => v - 1);
    } else {
      setViewMonth(v => v - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(v => v + 1);
    } else {
      setViewMonth(v => v + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleSetToday = () => {
    const now = new Date();
    const formatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    onChange(formatted);
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setIsOpen(false);
  };

  const handleSetYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const formatted = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;
    onChange(formatted);
    setViewYear(yesterday.getFullYear());
    setViewMonth(yesterday.getMonth());
    setIsOpen(false);
  };

  const calendarDays = React.useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    let startDay = firstDayOfMonth.getDay() - 1;
    if (startDay === -1) startDay = 6;

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{ day: number; isCurrentMonth: boolean; dateObj: Date }> = [];

    // Previous month padding
    for (let i = startDay - 1; i >= 0; i--) {
      const prevDay = daysInPrevMonth - i;
      days.push({
        day: prevDay,
        isCurrentMonth: false,
        dateObj: new Date(viewYear, viewMonth - 1, prevDay)
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        dateObj: new Date(viewYear, viewMonth, i)
      });
    }

    // Next month padding to fill complete weeks
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        dateObj: new Date(viewYear, viewMonth + 1, i)
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  const isToday = (date: Date) => {
    const now = new Date();
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    if (!value) return false;
    const [y, m, d] = value.split('-').map(Number);
    return (
      date.getDate() === d &&
      date.getMonth() === m - 1 &&
      date.getFullYear() === y
    );
  };

  const handleToggle = () => {
    if (!isOpen) {
      const pos = getCalculatedPosition();
      if (pos) {
        setPopupPos(pos);
      }
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Input Display Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full h-9 bg-zinc-950 hover:bg-zinc-900 border border-zinc-700/50 hover:border-zinc-600 rounded-xl px-3 text-[11px] text-zinc-200 focus:outline-none focus:border-zinc-500 transition-colors font-sans flex items-center justify-between gap-3 cursor-pointer shadow-xs group ${buttonClassName}`}
      >
        <span className={`tracking-wide font-medium ${!value ? 'text-zinc-500' : 'text-zinc-200'}`}>
          {displayFormatted}
        </span>
        
        {/* Calendar Icon */}
        <div className="flex items-center text-zinc-300 group-hover:text-zinc-100 transition-colors">
          <CalendarIcon size={14} className="shrink-0" />
        </div>
      </button>

      {/* Dropdown Popup Portal */}
      {isOpen && popupPos && typeof document !== 'undefined' && createPortal(
        <div 
          ref={popupRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: `${popupPos.top}px`,
            left: `${popupPos.left}px`,
            width: `${popupPos.width}px`,
            zIndex: 99999,
          }}
          className="bg-zinc-900/98 border border-zinc-700/80 rounded-2xl p-3.5 shadow-2xl shadow-black/90 animate-in fade-in duration-100 select-none backdrop-blur-md"
        >
          {/* Quick Preset Buttons */}
          {showPresets && (
            <div className="flex items-center gap-1.5 mb-3 pb-2.5 border-b border-zinc-800/80">
              <button
                type="button"
                onClick={handleSetToday}
                className="flex-1 py-1 px-1.5 rounded-lg bg-zinc-950/80 hover:bg-zinc-800 text-[10px] font-medium text-zinc-300 hover:text-zinc-100 border border-zinc-700/40 hover:border-zinc-600 transition-all cursor-pointer text-center"
              >
                Bugün
              </button>
              <button
                type="button"
                onClick={handleSetYesterday}
                className="flex-1 py-1 px-1.5 rounded-lg bg-zinc-950/80 hover:bg-zinc-800 text-[10px] font-medium text-zinc-300 hover:text-zinc-100 border border-zinc-700/40 hover:border-zinc-600 transition-all cursor-pointer text-center"
              >
                Dün
              </button>
            </div>
          )}

          {/* Month & Year Navigation */}
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold text-zinc-100 tracking-wide">
              {TURKISH_MONTHS[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700/50 rounded-xl p-0.5 shadow-xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-6.5 h-6.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 flex items-center justify-center transition-colors duration-150 cursor-pointer"
              >
                <ChevronLeft size={13} />
              </button>
              <div className="w-px h-3.5 bg-zinc-800" />
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-6.5 h-6.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 flex items-center justify-center transition-colors duration-150 cursor-pointer"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {TURKISH_DAYS_SHORT.map((day) => (
              <span key={day} className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((item, idx) => {
              const selected = isSelected(item.dateObj);
              const today = isToday(item.dateObj);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (item.isCurrentMonth) {
                      handleSelectDay(item.day);
                    } else {
                      setViewYear(item.dateObj.getFullYear());
                      setViewMonth(item.dateObj.getMonth());
                      const d = item.dateObj;
                      const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                      onChange(formatted);
                      setIsOpen(false);
                    }
                  }}
                  className={`h-6.5 text-[10px] font-sans rounded-lg transition-all flex items-center justify-center relative cursor-pointer ${
                    selected
                      ? 'bg-blue-500/25 text-blue-300 border border-blue-500/40 font-bold shadow-xs'
                      : !item.isCurrentMonth
                      ? 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/30'
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80'
                  }`}
                >
                  <span>{item.day}</span>
                  {today && !selected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});
