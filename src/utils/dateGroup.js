/**
 * 대화 목록을 날짜별로 그룹핑
 */

export function groupByDate(conversations) {
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterdayStr = new Date(now - 86400000).toDateString();
  const weekAgo = now.getTime() - 7 * 86400000;

  const buckets = {
    '오늘': [],
    '어제': [],
    '이번 주': [],
    '이번 달': [],
    '이전': [],
  };

  for (const conv of conversations) {
    const d = new Date(conv.updatedAt);
    const ds = d.toDateString();
    if (ds === todayStr) buckets['오늘'].push(conv);
    else if (ds === yesterdayStr) buckets['어제'].push(conv);
    else if (d.getTime() > weekAgo) buckets['이번 주'].push(conv);
    else if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear())
      buckets['이번 달'].push(conv);
    else buckets['이전'].push(conv);
  }

  const groups = [];
  for (const [label, items] of Object.entries(buckets)) {
    if (items.length > 0) groups.push({ label, items });
  }
  return groups;
}

/** 상대 시간 표시 (예: "3분 전", "어제 오후 3:42") */
export function relativeTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;

  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  const ampm = hour < 12 ? '오전' : '오후';
  const h12 = hour % 12 || 12;

  if (d.getFullYear() === now.getFullYear()) {
    return `${month}/${day} ${ampm} ${h12}:${min}`;
  }
  return `${d.getFullYear()}.${month}.${day}`;
}
