export interface TrackerCreateBody {
  provider?: string;
  apiKey?: string;
}

export interface TrackerUpdateKeyBody {
  apiKey?: string;
}

export interface TrackerSyncMessage {
  trackerId: string;
}
