export interface WebRtcTransport {
  id: string;
  iceParameters: any;
  iceCandidates: any[];
  dtlsParameters: any;
  connect(params: { dtlsParameters: any }): Promise<void>;
  produce(params: { kind: string; rtpParameters: any }): Promise<Producer>;
  close(): void;
  on(event: string, callback: (...args: any[]) => void): void;
}

export interface Producer {
  id: string;
  close(): void;
  on(event: string, callback: (...args: any[]) => void): void;
}