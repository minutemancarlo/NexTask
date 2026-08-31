/**
 * Browser Desktop Notifications Utility for NexTask
 */

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (err) {
    return Notification.permission;
  }
}

export function showTicketNotification(ticket, onClickAction) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }

  const title = `NexTask • New Ticket #${ticket.opId}`;
  const body = `${ticket.subject}\nProject: ${ticket.projectName || 'General'} | QA: ${ticket.qaContact || 'N/A'}`;

  // Get absolute URL for app logo icon so OS notification manager loads it properly
  const iconUrl = new URL('/favicon.svg', window.location.origin).href;

  try {
    const notification = new Notification(title, {
      body,
      icon: iconUrl,
      badge: iconUrl,
      tag: `nextask-ticket-${ticket.opId}`,
      renotify: true,
      requireInteraction: false,
    });

    notification.onclick = () => {
      window.focus();
      if (typeof onClickAction === 'function') {
        onClickAction();
      }
      notification.close();
    };

    return notification;
  } catch (e) {
    console.warn('Failed to display browser notification:', e);
    return null;
  }
}
