import {Link} from 'react-router-dom'
export default function FolionLogo({light=false,to='/home'}:{light?:boolean;to?:string}){return <Link to={to} className={`folion-wordmark ${light?'text-white':'text-ink'}`}><span aria-hidden="true"><i/><i/><i/></span><strong>FOLION</strong></Link>}
