export interface DateLinkGroup {
  label: string
  items: string[]
}

export interface DateLinkEntry {
  groups: DateLinkGroup[]
}

export type DateLinksMap = Record<string, DateLinkEntry>
