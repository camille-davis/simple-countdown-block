(function () {
	// Time constants for countdown calculations
	const MS_PER_DAY = 86400000; // 1000 * 60 * 60 * 24
	const MS_PER_HOUR = 3600000; // 1000 * 60 * 60
	const MS_PER_MINUTE = 60000; // 1000 * 60

	// Default values for countdown.
	const ZEROS = { days: 0, hours: 0, minutes: 0, seconds: 0 };

	// Translated labels labels from wp_localize_script.
	const LABELS = simpleCountdownBlock.labels;

	/**
	 * Convert date, time, and timezone to UTC timestamp.
	 *
	 * @param {string} dateString - Date string in YYYY-MM-DD format.
	 * @param {string} timeString - Time string in HH:MM format.
	 * @param {string} timezone - Timezone identifier (e.g., 'UTC', 'America/New_York').
	 * @returns {number} UTC timestamp in milliseconds.
	 */
	function convertToUTC(dateString, timeString, timezone) {

		// Parse target date and time.
		const dateParts = dateString.split("-");
		const timeParts = (timeString).split(":");
		const year = parseInt(dateParts[0], 10);
		const month = parseInt(dateParts[1], 10) - 1; // JavaScript months are 0-indexed
		const day = parseInt(dateParts[2], 10);
		const hour = parseInt(timeParts[0], 10);
		const minute = parseInt(timeParts[1], 10);

		// For UTC timezone, return UTC timestamp directly.
		if (timezone === "UTC" || !timezone) {
			return Date.UTC(
				year, month, day, hour, minute, 0, 0
			);
		}

		// For other timezones, find UTC time that represents desired local time.
		const formatter = new Intl.DateTimeFormat("en-US", {
			timeZone: timezone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});

		// Start with noon UTC to avoid DST edge cases, then refine.
		let candidateUTC = Date.UTC(year, month, day, 12, 0, 0, 0);

		// Usually converges in 2-3 iterations, so limit to 5 for safety.
		for (let i = 0; i < 5; i++) {
			const parts = formatter.formatToParts(new Date(candidateUTC));
			const partsMap = new Map(parts.map(p => [p.type, parseInt(p.value, 10)]));
			const tzYear = partsMap.get('year');
			const tzMonth = partsMap.get('month') - 1;
			const tzDay = partsMap.get('day');
			const tzHour = partsMap.get('hour');
			const tzMinute = partsMap.get('minute');

			if (tzYear === year && tzMonth === month && tzDay === day && tzHour === hour && tzMinute === minute) {
				break;
			}

			// Adjust by the difference in local time representation.
			const desiredLocalMs = Date.UTC(year, month, day, hour, minute, 0, 0);
			const currentLocalMs = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute, 0, 0);
			const diff = desiredLocalMs - currentLocalMs;
			candidateUTC += diff;

			if (Math.abs(diff) < 1000) {
				break;
			}
		}

		return candidateUTC;
	}

	/**
	 * Calculate countdown values from target date.
	 *
	 * @param {number} targetDate - Target date as UTC timestamp in milliseconds.
	 * @returns {Object} Object with days, hours, minutes, and seconds properties.
	 */
	function calculateCountdown(targetDate) {
		const now = Date.now();
		const diff = targetDate - now;

		if (diff <= 0) {
			return ZEROS;
		}

		// Calculate time components from UTC difference.
		return {
			days: Math.floor(diff / MS_PER_DAY),
			hours: Math.floor((diff % MS_PER_DAY) / MS_PER_HOUR),
			minutes: Math.floor((diff % MS_PER_HOUR) / MS_PER_MINUTE),
			seconds: Math.floor((diff % MS_PER_MINUTE) / 1000)
		};
	}


	/**
	 * Update the display with countdown values.
	 *
	 * @param {Element} container - Container element.
	 * @param {Object} countdown - Countdown values.
	 */
	function updateDisplay(container, countdown) {

		// Update all time units.
		['days', 'hours', 'minutes', 'seconds'].forEach((unit) => {
			const item = container.querySelector(`[data-unit="${unit}"]`);
			const value = countdown[unit];

			// Update the number.
			item.querySelector('.wp-block-simple-countdown-block-countdown__number').textContent = value;

			// Update the label (singular if value is 1, plural otherwise).
			const label = value === 1 ? LABELS[unit].singular : LABELS[unit].plural;
			item.querySelector('.wp-block-simple-countdown-block-countdown__label').textContent = label;
		});
	}

	/**
	 * Update countdown display for a block.
	 *
	 * @param {Element} container - Container element.
	 * @param {number} targetUTC - Target date as UTC timestamp (milliseconds).
	 */
	function updateCountdown(container, targetUTC) {
		const now = Date.now();
		const diff = targetUTC - now;

		// If the target date is in the past, return 0 for all units.
		if (diff <= 0) {
			updateDisplay(container, ZEROS);
			return;
		}

		// Calculate countdown values.
		const countdown = calculateCountdown(targetUTC);

		// Update the display.
		updateDisplay(container, countdown);
	}

	/**
	 * Initialize countdown for a single block.
	 *
	 * @param {Element} block - Block element.
	 */
	function initCountdown(block) {
		const container = block.querySelector('.wp-block-simple-countdown-block-countdown__container');

		// Get target date, time, and timezone.
		const targetDate = block.getAttribute('data-target-date');
		const targetTime = block.getAttribute('data-target-time');
		const timezone = block.getAttribute('data-timezone');

		// If no target date, show 0 for all units.
		if (!targetDate) {
			updateDisplay(container, ZEROS);
			return;
		}

		// Get UTC timestamp of target date and time for the given timezone.
		const targetUTC = convertToUTC(targetDate, targetTime, timezone);

		// Update immediately.
		updateCountdown(container, targetUTC);

		// Update every second.
		setInterval(() => {
			updateCountdown(container, targetUTC);
		}, 1000);
	}

	/**
	 * Initialize all countdown blocks on the page.
	 */
	document.addEventListener('DOMContentLoaded', function () {
		document.querySelectorAll('[data-target-date]').forEach(initCountdown);
	});
})();
