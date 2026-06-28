import {Link,NavLink} from 'react-router-dom'
import FolionLogo from './FolionLogo'
import {Button} from './ui'
export default function PublicNav(){return <header className="public-nav"><FolionLogo/><nav className="hidden sm:flex gap-6 text-sm"><NavLink to="/magazine">Magazine</NavLink><NavLink to="/company/fieldwork-studio">Practices</NavLink><Link to="/">About Folion</Link></nav><Link to="/home"><Button>Enter practice</Button></Link></header>}
