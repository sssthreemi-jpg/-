/**
 * 챗봇 메시지 내 테이블 렌더링
 * memo로 감싸서 리렌더 방지 (rerender-memo)
 */
import { memo } from 'react';

export default memo(function ChatTable({ tableData }) {
  if (!tableData || !Array.isArray(tableData) || tableData.length === 0) return null;

  const headers = Object.keys(tableData[0]);

  function formatCell(value) {
    if (value == null) return '-';
    if (typeof value === 'number') {
      if (Math.abs(value) > 1) {
        return Math.round(value).toLocaleString('ko-KR');
      }
      return value.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    return String(value);
  }

  function cellClass(value) {
    if (typeof value === 'number') {
      if (value > 0) return 'text-increase';
      if (value < 0) return 'text-decrease';
    }
    if (typeof value === 'string') {
      if (value.includes('▲') || value.includes('+')) return 'text-increase';
      if (value.includes('▼') || value.includes('-')) return 'text-decrease';
    }
    return '';
  }

  function isNumeric(key) {
    return tableData.some((row) => typeof row[key] === 'number');
  }

  return (
    <div className="my-2 overflow-x-auto rounded-lg border border-border" style={{ maxHeight: 300, overflowY: 'auto' }}>
      <table className="w-full text-xs whitespace-nowrap">
        <thead>
          <tr className="bg-highlight sticky top-0">
            {headers.map((h) => (
              <th key={h} className={`px-2.5 py-1.5 font-semibold border-b border-border ${isNumeric(h) ? 'text-right' : 'text-left'}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, i) => (
            <tr key={i} className="border-b border-border-light hover:bg-surface">
              {headers.map((h) => (
                <td key={h} className={`px-2.5 py-1.5 ${isNumeric(h) ? 'text-right' : 'text-left'} ${cellClass(row[h])}`}>
                  {formatCell(row[h])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
})
