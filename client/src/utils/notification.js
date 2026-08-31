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

  const title = `🔔 New OpenProject Ticket #${ticket.opId}`;
  const body = `${ticket.subject}\nProject: ${ticket.projectName || 'Default'} | Priority: ${ticket.priorityTitle || 'Normal'}`;

  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: `op-ticket-${ticket.opId}`,
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
