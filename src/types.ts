export type Visibility='public'|'private'
export interface TeamMember{personId:string;name:string;projectRole:string}
export interface Story{brief:string;challenge:string;response:string;outcome:string;lessons:string}
export interface Project{id:string;projectName:string;visibility:Visibility;status:string;company:string;location:string;sector:string;year:string;client:string;siteArea:string;gfa:string;height:string;services:string[];team:TeamMember[];story:Story;assets:string[];tags:string[];coverImage:string}
export interface Collection{id:string;name:string;description:string;projectIds:string[]}
export interface Person{id:string;name:string;position:string;office:string;email:string;bio:string;skills:string[]}
