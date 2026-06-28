import {ArrowRight,FileUp} from 'lucide-react'
import {Link} from 'react-router-dom'
import NewProject from './NewProject'
export default function NewProjectEntry(){return <><div className="reflection-entry-wrap"><Link to="/project-reflection" className="reflection-entry"><span><FileUp/></span><div><strong>Start from project reports</strong><p>Upload reports, review the extracted facts, then complete a five-minute adaptive Project Reflection.</p></div><ArrowRight/></Link></div><NewProject/></>}
