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

export function showAssigneeChangeNotification(ticket, onClickAction) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }

  const title = `NexTask • Ticket #${ticket.opId} Reassigned`;
  const previous = ticket.previousAssignee || 'You';
  const next = ticket.newAssignee || 'Unassigned';
  const body = `${ticket.subject}\nReassigned: ${previous} ➔ ${next}\nProject: ${ticket.projectName || 'General'}`;

  const iconUrl = new URL('/favicon.svg', window.location.origin).href;

  try {
    const notification = new Notification(title, {
      body,
      icon: iconUrl,
      badge: iconUrl,
      tag: `nextask-reassign-${ticket.opId}-${next}`,
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
    console.warn('Failed to display reassignment notification:', e);
    return null;
  }
}

export function showServerDownNotification(failureCount, errorMessage, onClickAction) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }

  const isThirdRetry = failureCount >= 3;
  const title = isThirdRetry
    ? `NexTask • OpenProject Unreachable (3 Retries Failed)`
    : `NexTask • OpenProject Server Down`;

  const body = isThirdRetry
    ? `Cannot reach OpenProject after 3 retries. Please check host URL, network connection, or VPN.\nError: ${errorMessage || 'Unreachable'}`
    : `Connection to OpenProject failed. Retrying in background...\nError: ${errorMessage || 'Connection failed'}`;

  const iconUrl = new URL('/favicon.svg', window.location.origin).href;

  try {
    const notification = new Notification(title, {
      body,
      icon: iconUrl,
      badge: iconUrl,
      tag: `nextask-server-down-${isThirdRetry ? 'persistent' : 'initial'}`,
      renotify: true,
      requireInteraction: isThirdRetry,
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
    console.warn('Failed to display server down notification:', e);
    return null;
  }
}
