import {AlertCircle,ArrowUpRight,Clock3} from 'lucide-react'
import {Link} from 'react-router-dom'
import activities from '../data/activities.json'

export default function RightActivityPanel(){
  const attention=activities.find(activity=>activity.type==='attention')
  const recent=activities.filter(activity=>activity.type!=='attention')
  return <aside className="activity-panel">
    <section><h3 className="activity-title"><AlertCircle size={14}/> Required attention</h3><Link to="/projects/mallee-retreat" className="attention-card"><span className="attention-dot"/><div><strong>{attention?.title}</strong><p>{attention?.detail}</p><span className="attention-action">Review project <ArrowUpRight size={13}/></span></div></Link></section>
    <section><h3 className="activity-title"><Clock3 size={14}/> Recent activity</h3><div className="activity-list">{recent.map(activity=><div key={activity.id} className="activity-item"><span className={`activity-marker ${activity.type}`}/><div><strong>{activity.title}</strong><p>{activity.detail}</p><time>{activity.time}</time></div></div>)}</div></section>
  </aside>
}
