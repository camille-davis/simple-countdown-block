<?php
/**
 * Plugin Name: Simple Countdown Block
 * Plugin URI: https://github.com/camilledavis/simple-countdown-block
 * Description: A block with a countdown timer to a selected date.
 * Version: 1.0.0
 * Author: Camille Davis
 * License: GPL-2.0-or-later
 * Text Domain: simple-countdown-block
 *
 * @package SimpleCountdownBlock
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Load the render callback.
require_once __DIR__ . '/render.php';

/**
 * Get countdown labels for localization.
 *
 * @return array Labels array with singular and plural forms.
 */
function simple_countdown_block_get_labels() {
	return array(
		'days' => array(
			'singular' => __( 'Day', 'simple-countdown-block' ),
			'plural' => __( 'Days', 'simple-countdown-block' ),
		),
		'hours' => array(
			'singular' => __( 'Hour', 'simple-countdown-block' ),
			'plural' => __( 'Hours', 'simple-countdown-block' ),
		),
		'minutes' => array(
			'singular' => __( 'Minute', 'simple-countdown-block' ),
			'plural' => __( 'Minutes', 'simple-countdown-block' ),
		),
		'seconds' => array(
			'singular' => __( 'Second', 'simple-countdown-block' ),
			'plural' => __( 'Seconds', 'simple-countdown-block' ),
		),
	);
}

/**
 * Get timezone labels for localization.
 *
 * @return array Timezone labels array.
 */
function simple_countdown_block_get_timezones() {
	return array(
		'UTC' => __( 'UTC', 'simple-countdown-block' ),
		'America/New_York' => __( 'America/New_York (EST/EDT)', 'simple-countdown-block' ),
		'America/Chicago' => __( 'America/Chicago (CST/CDT)', 'simple-countdown-block' ),
		'America/Denver' => __( 'America/Denver (MST/MDT)', 'simple-countdown-block' ),
		'America/Los_Angeles' => __( 'America/Los_Angeles (PST/PDT)', 'simple-countdown-block' ),
		'Europe/London' => __( 'Europe/London (GMT/BST)', 'simple-countdown-block' ),
		'Europe/Paris' => __( 'Europe/Paris (CET/CEST)', 'simple-countdown-block' ),
		'Europe/Berlin' => __( 'Europe/Berlin (CET/CEST)', 'simple-countdown-block' ),
		'Asia/Tokyo' => __( 'Asia/Tokyo (JST)', 'simple-countdown-block' ),
		'Asia/Shanghai' => __( 'Asia/Shanghai (CST)', 'simple-countdown-block' ),
		'Australia/Sydney' => __( 'Australia/Sydney (AEST/AEDT)', 'simple-countdown-block' ),
	);
}

/**
 * Get UI strings for localization.
 *
 * @return array UI strings array.
 */
function simple_countdown_block_get_strings() {
	return array(
		'countdownSettings' => __( 'Countdown Settings', 'simple-countdown-block' ),
		'targetDate' => __( 'Target Date', 'simple-countdown-block' ),
		'targetTime' => __( 'Target Time (HH:MM)', 'simple-countdown-block' ),
		'timezone' => __( 'Timezone', 'simple-countdown-block' ),
		'timezoneHelp' => __( 'Select the timezone for the target date and time.', 'simple-countdown-block' ),
		'timeHelpText' => __( 'Enter time in 24-hour format (e.g., 14:30)', 'simple-countdown-block' ),
	);
}

/**
 * Register the block using config from block.json.
 */
function simple_countdown_block_register_block() {
	// Register the view script.
	wp_register_script(
		'simple-countdown-block-countdown-view-script',
		plugin_dir_url( __FILE__ ) . 'countdown.js',
		array(),
		'1.0.0',
		array( 'strategy' => 'defer' )
	);

	// Localize the view script immediately after registration.
	// This ensures localization happens before WordPress enqueues it during block rendering.
	wp_localize_script(
		'simple-countdown-block-countdown-view-script',
		'simpleCountdownBlock',
		array(
			'labels' => simple_countdown_block_get_labels(),
		)
	);

	// Register the block with view script.
	register_block_type(
		__DIR__,
		array(
			'render_callback' => 'simple_countdown_block_render',
			'view_script_handles' => array( 'simple-countdown-block-countdown-view-script' ),
		)
	);
}
add_action( 'init', 'simple_countdown_block_register_block' );

/**
 * Enqueue editor script and localize translations.
 */
function simple_countdown_block_enqueue_editor_assets() {
	wp_enqueue_script(
		'simple-countdown-block-editor',
		plugin_dir_url( __FILE__ ) . 'index.js',
		array( 'wp-blocks', 'wp-block-editor', 'wp-components', 'wp-element' ),
		'1.0.0',
		true
	);

	// Localize script with translations.
	wp_localize_script(
		'simple-countdown-block-editor',
		'simpleCountdownBlock',
		array(
			'labels' => simple_countdown_block_get_labels(),
			'timezones' => simple_countdown_block_get_timezones(),
			'strings' => simple_countdown_block_get_strings(),
		)
	);
}
add_action( 'enqueue_block_editor_assets', 'simple_countdown_block_enqueue_editor_assets' );

/**
 * Remove script version in development mode.
 */
function simple_countdown_block_remove_version_script( $src ) {
	if ( defined( 'WP_DEBUG' ) && WP_DEBUG && strpos( $src, 'simple-countdown-block' ) !== false && strpos( $src, 'ver=' ) !== false ) {
		$src = remove_query_arg( 'ver', $src );
	}
	return $src;
}
add_filter( 'script_loader_src', 'simple_countdown_block_remove_version_script', 9999 );
