<?php
/**
 * Render `simple-countdown-block/countdown` block for display.
 *
 * @package SimpleCountdownBlock
 */

/**
 * Render callback for the `simple-countdown-block/countdown` block.
 *
 * @param array  $attributes Attributes of the block being rendered.
 * @param string $content    Content of the block being rendered.
 * @return string The content of the block being rendered.
 */
function simple_countdown_block_render( $attributes, $content ) {
	$target_date = isset( $attributes['targetDate'] ) ? $attributes['targetDate'] : '';
	$target_time = isset( $attributes['targetTime'] ) ? $attributes['targetTime'] : '00:00';
	$timezone = isset( $attributes['timezone'] ) ? $attributes['timezone'] : 'UTC';

	// Create unique ID for this countdown instance.
	$unique_id = wp_unique_id( 'countdown-' );

	// Build wrapper attributes with data attributes for JavaScript.
	$wrapper_attributes = get_block_wrapper_attributes(
		array(
			'data-target-date' => esc_attr( $target_date ),
			'data-target-time' => esc_attr( $target_time ),
			'data-timezone'    => esc_attr( $timezone ),
			'data-unique-id'   => esc_attr( $unique_id ),
		)
	);

	// Define countdown units.
	$units = array(
		'days'    => __( 'Days', 'simple-countdown-block' ),
		'hours'   => __( 'Hours', 'simple-countdown-block' ),
		'minutes' => __( 'Minutes', 'simple-countdown-block' ),
		'seconds' => __( 'Seconds', 'simple-countdown-block' ),
	);

	// Build HTML output.
	$output = '<div ' . $wrapper_attributes . '>';
	$output .= '<div class="wp-block-simple-countdown-block-countdown__container">';

	foreach ( $units as $unit => $label ) {
		$output .= '<div class="wp-block-simple-countdown-block-countdown__item" data-unit="' . esc_attr( $unit ) . '">';
		$output .= '<div class="wp-block-simple-countdown-block-countdown__number">0</div>';
		$output .= '<div class="wp-block-simple-countdown-block-countdown__label">' . esc_html( $label ) . '</div>';
		$output .= '</div>';
	}

	$output .= '</div>';
	$output .= '</div>';

	return $output;
}
