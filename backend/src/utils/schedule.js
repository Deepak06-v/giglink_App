/**
 * Schedule utilities for calculating job duration and multi-day schedules
 * 
 * Key behaviors:
 * - Times are stored as 24-hour strings: "HH:MM"
 * - Dates are Date objects or ISO8601 strings
 * - Overnight jobs (e.g., 22:00 to 02:00) are 4 hours, not -20 hours
 * - Multi-day jobs have the same time window (startTime → endTime) each day
 * - All calculations are in local time (no timezone conversion)
 */

/**
 * Convert time string "HH:MM" to minutes since midnight
 * @param {string} timeStr - Time in format "HH:MM"
 * @returns {number} Minutes since midnight
 * @throws Error if format is invalid
 */
export const timeToMinutes = (timeStr) => {
  if (typeof timeStr !== 'string') {
    throw new Error(`Invalid time format: expected string, got ${typeof timeStr}`);
  }
  
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid time format: "${timeStr}". Expected "HH:MM" (24-hour format)`);
  }
  
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time values: hours=${hours}, minutes=${minutes}`);
  }
  
  return hours * 60 + minutes;
};

/**
 * Calculate duration in hours between two times
 * Handles overnight shifts correctly (22:00 to 02:00 = 4 hours)
 * 
 * @param {string} startTime - Start time "HH:MM"
 * @param {string} endTime - End time "HH:MM"
 * @returns {number} Duration in hours (decimal, e.g., 8.5)
 * @throws Error if time format is invalid
 */
export const calculateHoursBetweenTimes = (startTime, endTime) => {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  // If end time is earlier than start time, it's an overnight shift
  // e.g., 22:00 to 02:00 means 02:00 next day
  let durationMinutes;
  if (endMinutes <= startMinutes) {
    // Overnight shift: (1440 - startMinutes) + endMinutes
    // 1440 = 24 hours * 60 minutes
    durationMinutes = (1440 - startMinutes) + endMinutes;
  } else {
    durationMinutes = endMinutes - startMinutes;
  }
  
  return durationMinutes / 60; // Convert to hours
};

/**
 * Calculate number of calendar days between two dates (inclusive)
 * 
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Number of days (e.g., same day = 1 day)
 * @throws Error if dates are invalid or endDate < startDate
 */
export const calculateNumberOfDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime())) {
    throw new Error(`Invalid start date: ${startDate}`);
  }
  if (isNaN(end.getTime())) {
    throw new Error(`Invalid end date: ${endDate}`);
  }
  
  // Set time to start of day to avoid timezone issues
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  if (end < start) {
    throw new Error(`End date cannot be before start date: ${startDate} to ${endDate}`);
  }
  
  const diffMs = end - start;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Add 1 because same-day job counts as 1 day
  return diffDays + 1;
};

/**
 * Validate coordinates
 * @param {number} latitude - Latitude value
 * @param {number} longitude - Longitude value
 * @throws Error if coordinates are invalid
 */
export const validateCoordinates = (latitude, longitude) => {
  // Check if values exist
  if (latitude === undefined || latitude === null || latitude === '') {
    throw new Error('Latitude is required');
  }
  if (longitude === undefined || longitude === null || longitude === '') {
    throw new Error('Longitude is required');
  }
  
  const lat = Number(latitude);
  const lng = Number(longitude);
  
  // Check for NaN
  if (isNaN(lat)) {
    throw new Error(`Invalid latitude: "${latitude}" is not a number`);
  }
  if (isNaN(lng)) {
    throw new Error(`Invalid longitude: "${longitude}" is not a number`);
  }
  
  // Check for Infinity
  if (!isFinite(lat)) {
    throw new Error(`Invalid latitude: ${latitude} is not a finite number`);
  }
  if (!isFinite(lng)) {
    throw new Error(`Invalid longitude: ${longitude} is not a finite number`);
  }
  
  // Check valid ranges
  if (lat < -90 || lat > 90) {
    throw new Error(`Invalid latitude: ${lat}. Must be between -90 and 90`);
  }
  if (lng < -180 || lng > 180) {
    throw new Error(`Invalid longitude: ${lng}. Must be between -180 and 180`);
  }
  
  return { latitude: lat, longitude: lng };
};

/**
 * Calculate total scheduled hours for a multi-day job
 * Assumes same daily time window (startTime → endTime) each day
 * 
 * @param {number} numberOfDays - Number of scheduled days
 * @param {number} hoursPerDay - Hours worked per day
 * @returns {number} Total scheduled hours
 */
export const calculateTotalHours = (numberOfDays, hoursPerDay) => {
  return numberOfDays * hoursPerDay;
};

/**
 * Extract and validate date-only value (ignoring time)
 * Ensures a date string like "2026-08-20" doesn't get converted 
 * to "2026-08-19" due to timezone issues
 * 
 * @param {Date|string} dateValue - Date input
 * @returns {Date} Date object set to start of day in local time
 */
export const getDateOnly = (dateValue) => {
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateValue}`);
  }
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Build comprehensive schedule info object
 * 
 * @param {object} scheduleData - { startDate, endDate, startTime, endTime }
 * @returns {object} Schedule info with calculated fields
 * @throws Error if any validation fails
 */
export const buildScheduleInfo = (scheduleData) => {
  if (!scheduleData) {
    throw new Error('Schedule data is required');
  }
  
  const { startDate, endDate, startTime, endTime } = scheduleData;
  
  // Validate all fields are present
  if (!startDate) throw new Error('startDate is required');
  if (!endDate) throw new Error('endDate is required');
  if (!startTime) throw new Error('startTime is required');
  if (!endTime) throw new Error('endTime is required');
  
  // Calculate derived values
  const numberOfDays = calculateNumberOfDays(startDate, endDate);
  const hoursPerDay = calculateHoursBetweenTimes(startTime, endTime);
  const totalHours = calculateTotalHours(numberOfDays, hoursPerDay);
  
  return {
    numberOfDays,
    hoursPerDay,
    totalHours,
  };
};

/**
 * Format time for display (ensures HH:MM format)
 * @param {string} timeStr - Time string
 * @returns {string} Formatted time "HH:MM"
 */
export const formatTime = (timeStr) => {
  if (typeof timeStr !== 'string') {
    throw new Error('Time must be a string');
  }
  
  const minutes = timeToMinutes(timeStr); // Validates format
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};
