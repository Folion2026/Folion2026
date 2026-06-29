import {Search,SlidersHorizontal,X} from 'lucide-react'

export function SearchBar({value,onChange}:{value:string;onChange:(value:string)=>void}){
  return <div className="searchbar"><Search size={20}/><input value={value} onChange={event=>onChange(event.target.value)} placeholder="Ask about a project, place, material or idea…" aria-label="Search project memory"/>{value&&<button onClick={()=>onChange('')} aria-label="Clear search"><X size={17}/></button>}<kbd className="hidden md:flex ml-auto">⌘ K</kbd></div>
}

export function FilterChips({active,onChange}:{active:string;onChange:(value:string)=>void}){
  const filters=['All','Internal only','Externally shareable','Publicly publishable','Residential','Workplace','Education','Hospitality']
  return <div className="filter-row"><SlidersHorizontal size={15}/>{filters.map(filter=><button key={filter} onClick={()=>onChange(filter)} className={`chip ${active===filter?'active':''}`} aria-pressed={active===filter}>{filter}</button>)}</div>
}
