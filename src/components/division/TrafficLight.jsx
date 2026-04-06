import { TRAFFIC_BG } from '../../utils/trafficLight'

export default function TrafficLight({ status }) {
  if (!status) return null
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${TRAFFIC_BG[status] || 'bg-gray-300'}`}
      title={status === 'blue' ? '양호' : status === 'yellow' ? '주의' : '부진'}
    />
  )
}
