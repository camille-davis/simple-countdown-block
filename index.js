(function () {
	const { registerBlockType } = wp.blocks;
	const { useBlockProps, InspectorControls } = wp.blockEditor;
	const { PanelBody, BaseControl, TextControl, SelectControl } = wp.components;
	const { createElement, useState, useEffect } = wp.element;
	const { __ } = wp.i18n;
	const { SVG, Path } = wp.primitives;

	// Scheduled icon from Gutenberg icon library.
	const scheduledIcon = createElement(SVG, {
		viewBox: '0 0 24 24',
		xmlns: 'http://www.w3.org/2000/svg',
	}, createElement(Path, {
		d: 'M12 18.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13ZM4 12a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm9 1V8h-1.5v3.5h-2V13H13Z',
		fillRule: 'evenodd',
	}));

	// ============================================================================
	// Countdown utilities - same as in countdown.js
	// ============================================================================

	const zeros = { days: 0, hours: 0, minutes: 0, seconds: 0 };

	// Time constants for countdown calculations
	const MS_PER_DAY = 86400000; // 1000 * 60 * 60 * 24
	const MS_PER_HOUR = 3600000; // 1000 * 60 * 60
	const MS_PER_MINUTE = 60000; // 1000 * 60

	// Translated labels for days, hours, minutes, and seconds.
	const textDomain = 'simple-countdown-block';
	const LABELS = {
		days: {
			singular: __('Day', textDomain),
			plural: __('Days', textDomain)
		},
		hours: {
			singular: __('Hour', textDomain),
			plural: __('Hours', textDomain)
		},
		minutes: {
			singular: __('Minute', textDomain),
			plural: __('Minutes', textDomain)
		},
		seconds: {
			singular: __('Second', textDomain),
			plural: __('Seconds', textDomain)
		}
	};

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
		const timeParts = (timeString || "00:00").split(":");
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
			return zeros;
		}

		// Calculate time components from UTC difference.
		return {
			days: Math.floor(diff / MS_PER_DAY),
			hours: Math.floor((diff % MS_PER_DAY) / MS_PER_HOUR),
			minutes: Math.floor((diff % MS_PER_HOUR) / MS_PER_MINUTE),
			seconds: Math.floor((diff % MS_PER_MINUTE) / 1000)
		};
	}

	// ============================================================================
	// Editor utilities
	// ============================================================================

	/**
	 * Validate and format time string (HH:MM format).
	 *
	 * @param {string} timeString - Time string to validate.
	 * @returns {string} Formatted time string or '00:00' if invalid.
	 */
	function formatTime(timeString) {

		// Valid format check.
		if (/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(timeString)) {
			return timeString;
		}

		// Try to parse and format.
		const parts = timeString.split(':');
		if (parts.length === 2) {
			const hours = Math.max(0, Math.min(23, parseInt(parts[0], 10) || 0));
			const minutes = Math.max(0, Math.min(59, parseInt(parts[1], 10) || 0));
			return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
		}

		return '00:00';
	}

	/**
	 * Get timezone options for the dropdown.
	 *
	 * @returns {Array} Array of timezone option objects.
	 */
	function getTimezoneOptions() {
		return [
			{ label: __('UTC', 'simple-countdown-block'), value: 'UTC' },
			{ label: __('America/New_York (EST/EDT)', 'simple-countdown-block'), value: 'America/New_York' },
			{ label: __('America/Chicago (CST/CDT)', 'simple-countdown-block'), value: 'America/Chicago' },
			{ label: __('America/Denver (MST/MDT)', 'simple-countdown-block'), value: 'America/Denver' },
			{ label: __('America/Los_Angeles (PST/PDT)', 'simple-countdown-block'), value: 'America/Los_Angeles' },
			{ label: __('Europe/London (GMT/BST)', 'simple-countdown-block'), value: 'Europe/London' },
			{ label: __('Europe/Paris (CET/CEST)', 'simple-countdown-block'), value: 'Europe/Paris' },
			{ label: __('Europe/Berlin (CET/CEST)', 'simple-countdown-block'), value: 'Europe/Berlin' },
			{ label: __('Asia/Tokyo (JST)', 'simple-countdown-block'), value: 'Asia/Tokyo' },
			{ label: __('Asia/Shanghai (CST)', 'simple-countdown-block'), value: 'Asia/Shanghai' },
			{ label: __('Australia/Sydney (AEST/AEDT)', 'simple-countdown-block'), value: 'Australia/Sydney' },
		];
	}

	// ============================================================================
	// Register block type
	// ============================================================================

	registerBlockType('simple-countdown-block/countdown', {
		icon: scheduledIcon,

		/**
		 * Edit component for the countdown block.
		 *
		 * @param {Object} props - Component props.
		 * @param {Object} props.attributes - Block attributes.
		 * @param {Function} props.setAttributes - Function to update block attributes.
		 * @returns {Object} React element.
		 */
		edit: function Edit(props) {
			const { attributes, setAttributes } = props;
			const { targetDate, targetTime, timezone } = attributes;
			const blockProps = useBlockProps();

			// ============================================================================
			// State Management
			// ============================================================================

			// Local state for time input to avoid updating attribute on every keystroke.
			const [localTime, setLocalTime] = useState(targetTime || '00:00');

			// Sync local time state when the targetTime attribute changes externally
			// (e.g., when the block is loaded or when another component updates it).
			useEffect(function() {
				setLocalTime(targetTime || '00:00');
			}, [targetTime]);

			// State for countdown values (calculated statically in editor).
			// Unlike the frontend, the editor doesn't update continuously - only when attributes change.
			const [countdown, setCountdown] = useState(zeros);

			// ============================================================================
			// ============================================================================

			// Calculate countdown when attributes change (no continuous updates in editor).
			useEffect(function () {

				// If no target date is set, show zeros for all countdown units.
				if (!targetDate) {
					setCountdown(zeros);
					return;
				}

				try {
					// Use localTime if targetTime is not set yet (user hasn't blurred the time field).
					// This allows the countdown to update in real-time as the user types.
					const timeToUse = targetTime || localTime || '00:00';

					// Convert the date, time, and timezone to a UTC timestamp.
					const target = new Date(convertToUTC(targetDate, timeToUse, timezone || 'UTC'));

					// Check if the date is valid (isNaN check for invalid dates).
					if (isNaN(target.getTime())) {
						setCountdown(zeros);
						return;
					}

					// Calculate and set the countdown values.
					setCountdown(calculateCountdown(target));
				} catch (error) {
					// If any error occurs during calculation, show zeros.
					setCountdown(zeros);
				}
			}, [targetDate, targetTime, localTime, timezone]);

			/**
			 * Render a countdown unit (days, hours, minutes, or seconds).
			 *
			 * @param {string} unit - Unit name (days, hours, minutes, seconds).
			 * @param {number} value - Numeric value to display.
			 * @returns {Object} React element.
			 */
			const renderUnit = function (unit, value) {

				// Determine the label: singular if value is 1, plural otherwise.
				const label = value === 1 ? LABELS[unit].singular : LABELS[unit].plural;

				// Create the unit element with number and label.
				return createElement(
					'div',
					{ className: 'wp-block-simple-countdown-block-countdown__item' },
					createElement('div', { className: 'wp-block-simple-countdown-block-countdown__number' }, value),
					createElement('div', { className: 'wp-block-simple-countdown-block-countdown__label' }, label)
				);
			};

			return createElement(
				'div',
				blockProps,

				// Inspector Controls - Settings panel in the block editor sidebar.
				createElement(
					InspectorControls,
					null,
					createElement(
						PanelBody,
						{ title: __('Countdown Settings'), initialOpen: true },

						// Target Date input field.
						createElement(
							BaseControl,
							{ label: __('Target Date') },
							createElement('input', {
								type: 'date',
								value: targetDate || '',
								onChange: function (event) {

									// Update the targetDate attribute with the selected date value.
									setAttributes({ targetDate: event.target.value || '' });
								},
								className: 'components-text-control__input'
							})
						),

						// Time input field (HH:MM format).
						createElement(TextControl, {
							label: __('Target Time (HH:MM)'),
							value: localTime,
							onBlur: function (event) {

								// Format the time string to ensure it's valid (HH:MM format).
								const formatted = formatTime(event.target.value || '00:00');

								// Update both local state and the attribute.
								setLocalTime(formatted);
								setAttributes({ targetTime: formatted });
							},
							help: __('Enter time in 24-hour format (e.g., 14:30)'),
							placeholder: '00:00'
						}),

						// Timezone dropdown selector.
						createElement(SelectControl, {
							label: __('Timezone'),
							value: timezone || 'UTC',
							options: getTimezoneOptions(),
							onChange: function (value) {
								setAttributes({ timezone: value });
							},
							help: __('Select the timezone for the target date and time.')
						})
					)
				),

				// Countdown display container - shows the preview in the editor.
				createElement(
					'div',
					{ className: 'wp-block-simple-countdown-block-countdown__container' },
					renderUnit('days', countdown.days),
					renderUnit('hours', countdown.hours),
					renderUnit('minutes', countdown.minutes),
					renderUnit('seconds', countdown.seconds)
				)
			);
		},

		/**
		 * Save component for the countdown block.
		 *
		 * @returns {null} Returns null for server-side rendering.
		 */
		save: function Save() {
			return null;
		},
	});
})();
