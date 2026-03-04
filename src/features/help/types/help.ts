export interface HelpTip {
  id: string
  title: string
  description: string
}

export interface HelpTourStep {
  id: string
  title: string
  description: string
  selector: string
}

export interface HelpContext {
  routeKey: string
  pageTitle: string
  summary: string
  tips: HelpTip[]
  tour: HelpTourStep[]
}

export interface CrossPageGroup {
  pageTitle: string
  routeKey: string
  tips: HelpTip[]
}
