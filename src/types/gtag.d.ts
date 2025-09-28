interface Window {
  gtag?: (
    command: 'event',
    eventName: string,
    parameters: {
      event_category?: string;
      event_label?: string;
      [key: string]: any;
    }
  ) => void;
}