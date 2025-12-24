(function () {
	const { registerBlockType } = wp.blocks;
	const { useBlockProps, InspectorControls } = wp.blockEditor;
	const { PanelBody, BaseControl, SelectControl } = wp.components;
	const { createElement } = wp.element;
	const { SVG, Path } = wp.primitives;

	// Get localized strings from wp_localize_script.
	const LOCALIZED_DATA = simpleCountdownBlock;

	// Scheduled icon from Gutenberg icon library.
	const scheduledIcon = createElement(SVG, {
		viewBox: '0 0 24 24',
		xmlns: 'http://www.w3.org/2000/svg',
	}, createElement(Path, {
		d: 'M12 18.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13ZM4 12a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm9 1V8h-1.5v3.5h-2V13H13Z',
		fillRule: 'evenodd',
	}));

	// Default values for countdown.
	const ZEROS = { days: 0, hours: 0, minutes: 0, seconds: 0 };

	// Time constants for countdown calculations
	const MS_PER_DAY = 86400000; // 1000 * 60 * 60 * 24
	const MS_PER_HOUR = 3600000; // 1000 * 60 * 60
	const MS_PER_MINUTE = 60000; // 1000 * 60

	// ============================================================================
	// Countdown utilities - same as in countdown.js
	// ============================================================================

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
		const timezones = LOCALIZED_DATA.timezones;
		return [
			{ label: timezones['UTC'], value: 'UTC' },
			{ label: timezones['America/New_York'], value: 'America/New_York' },
			{ label: timezones['America/Chicago'], value: 'America/Chicago' },
			{ label: timezones['America/Denver'], value: 'America/Denver' },
			{ label: timezones['America/Los_Angeles'], value: 'America/Los_Angeles' },
			{ label: timezones['Europe/London'], value: 'Europe/London' },
			{ label: timezones['Europe/Paris'], value: 'Europe/Paris' },
			{ label: timezones['Europe/Berlin'], value: 'Europe/Berlin' },
			{ label: timezones['Asia/Tokyo'], value: 'Asia/Tokyo' },
			{ label: timezones['Asia/Shanghai'], value: 'Asia/Shanghai' },
			{ label: timezones['Australia/Sydney'], value: 'Australia/Sydney' },
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

			// Calculate countdown values from attributes.
			let countdown = ZEROS;
			if (targetDate) {
				const formattedTime = formatTime(targetTime);
				const target = new Date(convertToUTC(targetDate, formattedTime, timezone || 'UTC'));
				countdown = calculateCountdown(target);
			}

			/**
			 * Render a countdown unit (days, hours, minutes, or seconds).
			 *
			 * @param {string} unit - Unit name (days, hours, minutes, seconds).
			 * @param {number} value - Numeric value to display.
			 * @returns {Object} React element.
			 */
			const renderUnit = function (unit, value) {

				// Determine the label: singular if value is 1, plural otherwise.
				const LABELS = LOCALIZED_DATA.labels;
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
					{ title: LOCALIZED_DATA.strings.countdownSettings, initialOpen: true },

						// Target Date input field.
						createElement(
							BaseControl,
							{ label: LOCALIZED_DATA.strings.targetDate },
							createElement('input', {
								type: 'date',
								value: targetDate || '',

								// Update attribute while typing.
								onChange: function (event) {
									setAttributes({ targetDate: event.target.value || '' });
								},
								className: 'components-text-control__input'
							})
						),

						// Time input field (HH:MM format).
						createElement(
							BaseControl,
							{ label: LOCALIZED_DATA.strings.targetTime },
							createElement('input', {
								type: 'text',
								value: targetTime || '',

								// Update attribute while typing.
								onChange: function (event) {
									setAttributes({ targetTime: event.target.value });
								},

								// Format time on blur or 'Enter'.
								onBlur: function (event) {
									const formattedTime = formatTime(event.target.value);
									setAttributes({ targetTime: formattedTime });
								},
								onKeyDown: function (event) {
									if (event.key === 'Enter') {
										const formattedTime = formatTime(event.target.value);
										setAttributes({ targetTime: formattedTime });
									}
								},
								placeholder: '00:00',
								className: 'components-text-control__input',
								'aria-describedby': 'time-help-text'
							}),
							createElement('p', {
								id: 'time-help-text',
								className: 'components-base-control__help'
							}, LOCALIZED_DATA.strings.timeHelpText)
						),

						// Timezone dropdown selector.
						createElement(SelectControl, {
							label: LOCALIZED_DATA.strings.timezone,
							value: timezone || 'UTC',
							options: getTimezoneOptions(),
							onChange: function (value) {
								setAttributes({ timezone: value });
							},
							help: LOCALIZED_DATA.strings.timezoneHelp
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
