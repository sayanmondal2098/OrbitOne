import { Task } from '../context/TasksContext';

function parseTimeToHoursAndMinutes(timeStr?: string): { startHour: string, startMin: string, endHour: string, endMin: string } {
    let startHour = 9;
    let startMin = 0;
    
    if (timeStr) {
        const cleaned = timeStr.trim().toUpperCase();
        // Match HH:MM AM/PM or just HH:MM
        const matches = cleaned.match(/(\d+):(\d+)\s*(AM|PM)?/);
        if (matches) {
            startHour = parseInt(matches[1]);
            startMin = parseInt(matches[2]);
            const meridian = matches[3];
            if (meridian === 'PM' && startHour < 12) {
                startHour += 12;
            } else if (meridian === 'AM' && startHour === 12) {
                startHour = 0;
            }
        }
    }
    
    let endHour = startHour + 1;
    let endMin = startMin;
    if (endHour >= 24) {
        endHour = 23;
        endMin = 59;
    }
    
    return {
        startHour: String(startHour).padStart(2, '0'),
        startMin: String(startMin).padStart(2, '0'),
        endHour: String(endHour).padStart(2, '0'),
        endMin: String(endMin).padStart(2, '0')
    };
}

/**
 * Returns a template link that opens Google Calendar prefilled with task details.
 */
export function getGoogleCalendarUrl(task: Task): string {
    const { startHour, startMin, endHour, endMin } = parseTimeToHoursAndMinutes(task.scheduledTime);
    const dateFormatted = task.date.replace(/-/g, ''); // YYYYMMDD
    
    const startIso = `${dateFormatted}T${startHour}${startMin}00`;
    const endIso = `${dateFormatted}T${endHour}${endMin}00`;
    
    const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
    const text = encodeURIComponent(task.title);
    const dates = `${startIso}/${endIso}`;
    const details = encodeURIComponent(`OrbitOne Task\nCategory: ${task.category}\nPriority: ${task.priority}\nStatus: ${task.completed ? 'Completed' : 'Pending'}`);
    
    return `${baseUrl}&text=${text}&dates=${dates}&details=${details}`;
}

/**
 * Returns an iCalendar (.ics) data URI that prompts iOS to import the event to Apple Calendar natively.
 */
export function getAppleCalendarUrl(task: Task): string {
    const { startHour, startMin, endHour, endMin } = parseTimeToHoursAndMinutes(task.scheduledTime);
    const dateFormatted = task.date.replace(/-/g, ''); // YYYYMMDD
    
    const startIso = `${dateFormatted}T${startHour}${startMin}00`;
    const endIso = `${dateFormatted}T${endHour}${endMin}00`;
    
    const icsString = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//OrbitOne//Tasks Calendar//EN',
        'BEGIN:VEVENT',
        `UID:task-${task.id}@orbitone.app`,
        `DTSTAMP:${dateFormatted}T120000`,
        `DTSTART:${startIso}`,
        `DTEND:${endIso}`,
        `SUMMARY:${task.title}`,
        `DESCRIPTION:OrbitOne Task\\nCategory: ${task.category}\\nPriority: ${task.priority}\\nStatus: ${task.completed ? 'Completed' : 'Pending'}`,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
    
    return `data:text/calendar;charset=utf8,${encodeURIComponent(icsString)}`;
}
