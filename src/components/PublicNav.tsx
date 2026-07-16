import {Link,NavLink} from 'react-router-dom'
import FolionLogo from './FolionLogo'
import {ArrowRight} from 'lucide-react'
export default function PublicNav({overlay=false}:{overlay?:boolean}){return <header className={`public-nav marketing-nav ${overlay?'overlay':''}`}><FolionLogo to="/" light={overlay}/><nav><NavLink to="/product">Product</NavLink><NavLink to="/studio-product">Studio</NavLink><NavLink to="/how-it-works">How it works</NavLink><NavLink to="/network">Network</NavLink></nav><div className="marketing-nav-actions"><Link to="/sign-in">Sign in</Link><Link className="marketing-request" to="/sign-in">Request access <ArrowRight/></Link></div></header>}
