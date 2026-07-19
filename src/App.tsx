import {BrowserRouter,Navigate,Route,Routes} from 'react-router-dom'
import {StoreProvider} from './store'
import {AppShell} from './components/Shell'
import Landing from './pages/Landing'
import Home from './pages/Home'
import ProjectDetail from './pages/ProjectDetail'
import NewProject from './pages/NewProjectEntry'
import CollectionPage from './pages/Collection'
import Collections from './pages/Collections'
import StudioV2 from './pages/StudioV2'
import CompanyProfile from './pages/CompanyProfile'
import Magazine from './pages/Magazine'
import FolionId from './pages/FolionId'
import {AuthProvider} from './auth'
import AuthGate from './components/AuthGate'
import {HowItWorksMarketing,NetworkMarketing,ProductMarketing,StudioMarketing} from './pages/Marketing'

export default function App(){return <AuthProvider><StoreProvider><BrowserRouter><Routes>
 <Route path="/" element={<Landing/>}/><Route path="/product" element={<ProductMarketing/>}/><Route path="/studio-product" element={<StudioMarketing/>}/><Route path="/how-it-works" element={<HowItWorksMarketing/>}/><Route path="/network" element={<NetworkMarketing/>}/><Route path="/sign-in" element={<AuthGate><Navigate to="/home" replace/></AuthGate>}/><Route path="/magazine" element={<Magazine/>}/><Route path="/company/:id" element={<CompanyProfile/>}/>
 <Route element={<AuthGate><AppShell/></AuthGate>}><Route path="/home" element={<Home/>}/><Route path="/projects" element={<Navigate to="/home" replace/>}/><Route path="/projects/:id" element={<ProjectDetail/>}/><Route path="/new-project" element={<NewProject/>}/><Route path="/project-reflection" element={<Navigate to="/new-project" replace/>}/><Route path="/collections" element={<Collections/>}/><Route path="/collections/:id" element={<CollectionPage/>}/><Route path="/studio-v2" element={<StudioV2/>}/><Route path="/studio" element={<Navigate to="/studio-v2" replace/>}/><Route path="/studio/new/:type" element={<Navigate to="/studio-v2" replace/>}/><Route path="/studio/:id" element={<Navigate to="/studio-v2" replace/>}/><Route path="/folion-id" element={<FolionId/>}/></Route>
 </Routes></BrowserRouter></StoreProvider></AuthProvider>}
