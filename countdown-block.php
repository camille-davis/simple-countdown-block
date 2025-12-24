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
 * Register the block using config from block.json.
 */
function simple_countdown_block_register_block() {
	register_block_type( __DIR__, array( 'render_callback' => 'simple_countdown_block_render' ) );

	// Load script translations for countdown.js (viewScript).
	if ( function_exists( 'wp_set_script_translations' ) ) {
		wp_set_script_translations( 'simple-countdown-block-countdown', 'simple-countdown-block' );
	}
}
add_action( 'init', 'simple_countdown_block_register_block' );

/**
 * Enqueue editor script.
 */
function simple_countdown_block_enqueue_editor_assets() {
	// Load countdown.js first so its functions are available to index.js
	wp_enqueue_script(
		'simple-countdown-block-countdown',
		plugin_dir_url( __FILE__ ) . 'countdown.js',
		array(),
		'1.0.0',
		true
	);
	wp_enqueue_script(
		'simple-countdown-block-editor',
		plugin_dir_url( __FILE__ ) . 'index.js',
		array( 'wp-blocks', 'wp-block-editor', 'wp-components', 'wp-element', 'wp-i18n', 'simple-countdown-block-countdown' ),
		'1.0.0',
		true
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
