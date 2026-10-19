import re

with open('src/components/DeepAnalysis.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'const renderEquityCurve = \(\) => \{(.*?)\n  \};\n\n  return \(', content, re.DOTALL)
body = match.group(1)

component = """
const MemoizedEquityChart = React.memo(function MemoizedEquityChart({ 
  chartEquityCurve, 
  isRrMode, 
  currency, 
  equityFilter, 
  setSelectedEquityPoint 
}: { 
  chartEquityCurve: any[]; 
  isRrMode: boolean; 
  currency: string; 
  equityFilter: string; 
  setSelectedEquityPoint: (val: any) => void; 
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
""" + body + """
});
"""

# replace `const renderEquityCurve = () => { ... }` with `const renderEquityCurve = () => <MemoizedEquityChart ... />;`
replacement = """const renderEquityCurve = () => (
    <MemoizedEquityChart 
      chartEquityCurve={chartEquityCurve} 
      isRrMode={isRrMode} 
      currency={currency} 
      equityFilter={equityFilter} 
      setSelectedEquityPoint={setSelectedEquityPoint} 
    />
  );"""

new_content = content.replace(match.group(0), replacement + "\n\n  return (")

# insert component before `export const DeepAnalysis = React.memo(function DeepAnalysis({`
insert_idx = new_content.find("export const DeepAnalysis")
new_content = new_content[:insert_idx] + component + "\n\n" + new_content[insert_idx:]

with open('src/components/DeepAnalysis.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Replaced!")
