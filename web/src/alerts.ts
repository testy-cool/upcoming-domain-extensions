// Must match ALL_TOPIC and topic_for() in pipeline/s4_send_alerts_to_ntfy.py.
export const ALL_TOPIC = "testycool-domain-extensions"

export function topicFor(tld: string) {
  return `testycool-ext-${tld}`
}

export function ntfyUrl(topic: string) {
  return `https://ntfy.sh/${topic}`
}
