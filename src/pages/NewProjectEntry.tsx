import {ArrowRight,FileUp} from 'lucide-react'
import {Link} from 'react-router-dom'
import NewProject from './NewProject'
export default function NewProjectEntry(){return <><div className="reflection-entry-wrap"><Link to="/project-reflection" className="reflection-entry"><span><FileUp/></span><div><strong>Import Project</strong><p>Classify the material you have, add optional Team input, then review what Folion may safely reuse.</p></div><ArrowRight/></Link></div><NewProject/></>}
