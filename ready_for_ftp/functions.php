<?php

/**
 * INFOHAS - Child Theme Functions
 * Integrated & Optimized for Performance & Accessibility
 */

/** 1. ENQUEUE STYLES & SCRIPTS **/
function theme_enqueue_styles() {
    // Child theme stylesheet
    wp_enqueue_style('infohas-style', get_stylesheet_directory_uri() . '/style.css', array(), null);

    // OWL Carousel CSS — load conditionally on front page only (P2 fix).
    // Uses media="print" + onload swap trick to make them NON-render-blocking.
    if (is_front_page()) {
        wp_enqueue_style('owl-carousel',    get_stylesheet_directory_uri() . '/assets/carousel/css/owl.carousel.css',    array(), null, 'print');
        wp_enqueue_style('owl-theme',       get_stylesheet_directory_uri() . '/assets/carousel/css/owl.theme.css',       array(), null, 'print');
        wp_enqueue_style('owl-transitions', get_stylesheet_directory_uri() . '/assets/carousel/css/owl.transitions.css', array(), null, 'print');
    }

    wp_enqueue_script('infohas-custom-js',  get_stylesheet_directory_uri() . '/assets/js/infohas.js',           array(), '1.0.0', true);
    wp_enqueue_script('passive-listeners',  get_stylesheet_directory_uri() . '/assets/js/passive-listeners.js', array(), null,    true);
}
add_action('wp_enqueue_scripts', 'theme_enqueue_styles', 20);

/** 2. PERFORMANCE OPTIMIZATIONS **/

/**
 * Resource Hints & LCP Preload (P1 FIX)
 */
add_action('wp_head', 'infohas_perf_hints', 1);
function infohas_perf_hints() {
    // Preconnect to essential origins
    echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' . "\n";
    echo '<link rel="preconnect" href="https://www.google-analytics.com" crossorigin>' . "\n";

    if (is_front_page()) {
        // Preload the LCP hero image
        $hero_base = 'https://www.infohas.ma/wp-content/uploads/2025/12/formation-hotesse-de-l_air-et-steward-Maroc';
        echo '<link rel="preload" as="image"' . "\n";
        echo '  href="' . $hero_base . '.webp"' . "\n";
        echo '  imagesrcset="' . $hero_base . '-234x300.webp 234w, ';
        echo $hero_base . '-400x512.webp 400w, ';
        echo $hero_base . '-800x1024.webp 800w, ';
        echo $hero_base . '.webp 1824w"' . "\n";
        echo '  imagesizes="(max-width: 1024px) 100vw, (max-width: 640px) 100vw, 400px"' . "\n";
        echo '  fetchpriority="high">' . "\n";
    }
}

/**
 * Inline Critical CSS (P3 FIX)
 */
add_action('wp_head', 'infohas_critical_css', 2);
function infohas_critical_css() {
    if (!is_front_page()) return;
    ?>
    <style id="infohas-critical">
        .fusion-header-wrapper{position:relative;z-index:10000}
        .fusion-social-links-header .fusion-social-network-icon{color:#1a6fa3;height:44px;width:44px;text-align:center;line-height:44px}
        .fusion-header-banner img{display:block;width:100%;height:auto}
        .infoHasColumn_Section1{background-color:#fff;float:left;width:147px;height:116px;padding:10px;box-sizing:border-box;margin:8px;text-align:center}
        .fusion-main-menu li a{padding-left:20px;padding-right:20px;text-transform:uppercase}
        #flags_language_selector li{color:#1a6fa3;font-size:12px;float:left;display:inline-block;line-height:43px;margin-right:7px;margin-left:7px}
    </style>
    <?php
}

/**
 * Make OWL Carousel stylesheets non-render-blocking
 */
add_filter('style_loader_tag', 'infohas_owl_async_css', 10, 2);
function infohas_owl_async_css($html, $handle) {
    $async_handles = array('owl-carousel', 'owl-theme', 'owl-transitions');
    if (in_array($handle, $async_handles)) {
        $noscript = '<noscript>' . str_replace(" media='print'", '', $html) . '</noscript>';
        $html = str_replace("media='print'", "media='print' onload=\"this.media='all'\"", $html);
        return $html . $noscript;
    }
    return $html;
}

/**
 * Defer non-critical scripts for faster rendering
 */
add_filter('script_loader_tag', 'infohas_defer_scripts', 10, 2);
function infohas_defer_scripts($tag, $handle) {
    $exclude = array('jquery-core', 'jquery-migrate');
    if (is_admin() || in_array($handle, $exclude)) return $tag;
    return str_replace(' src', ' defer="defer" src', $tag);
}

/**
 * Remove query strings from static resources
 */
add_filter('style_loader_src', 'infohas_remove_script_version', 9999);
add_filter('script_loader_src', 'infohas_remove_script_version', 9999);
function infohas_remove_script_version($src) {
    return strpos($src, '?ver=') ? remove_query_arg('ver', $src) : $src;
}

/** 3. ACCESSIBILITY FIXES (A11Y) **/

/**
 * Inject aria-labels and roles landmarks
 */
add_action('wp_footer', 'infohas_a11y_fixes', 99);
function infohas_a11y_fixes() {
    ?>
    <script id="infohas-a11y-enhanced">
    (function() {
        var networkLabels = {
            'facebook':'INFOHAS sur Facebook','twitter':'INFOHAS sur Twitter / X',
            'x':'INFOHAS sur X','instagram':'INFOHAS sur Instagram',
            'youtube':'INFOHAS sur YouTube','linkedin':'INFOHAS sur LinkedIn',
            'whatsapp':'INFOHAS sur WhatsApp'
        };
        document.querySelectorAll('.fusion-social-links a, .fusion-social-networks a, .fusion-social-links-header a').forEach(function(a) {
            if (a.getAttribute('aria-label')) return;
            var network = '';
            a.classList.forEach(function(cls) { var m=cls.match(/^fusion-(.+)$/); if(m) network=m[1].toLowerCase(); });
            a.setAttribute('aria-label', networkLabels[network] || 'Réseau social INFOHAS');
        });
        var main = document.getElementById('main');
        if (main && !main.getAttribute('role')) main.setAttribute('role', 'main');
        document.querySelectorAll('button:not([aria-label]), input[type="submit"]:not([aria-label])').forEach(function(el) {
            if (!el.innerText.trim() && !el.value.trim()) el.setAttribute('aria-label', 'Bouton');
        });
        var keys = {};
        document.querySelectorAll('[accesskey]').forEach(function(el) {
            var key = el.getAttribute('accesskey');
            if (keys[key]) { el.removeAttribute('accesskey'); } else { keys[key] = true; }
        });
    })();
    </script>
    <?php
}

/** 4. CONDITIONAL CLEANUP **/

/**
 * Defer Google Maps & reCAPTCHA to Contact pages only
 */
add_action('wp_print_scripts', 'infohas_conditional_cleanup', 99);
function infohas_conditional_cleanup() {
    if (is_page(array('contact', 'contact-fr', 'contact-en', 'nous-contacter'))) return;
    $handles = array(
        'google-map', 'google-maps', 'googlemaps', 'gmaps', 'google_maps', 'avada-google-map', 'fusion-google-map',
        'google-recaptcha'
    );
    foreach ($handles as $handle) {
        wp_dequeue_script($handle);
        wp_deregister_script($handle);
    }
}

/** 5. THEME FEATURES & CUSTOM POST TYPES **/

function avada_lang_setup() {
    load_child_theme_textdomain('Avada', get_stylesheet_directory() . '/languages');
}
add_action('after_setup_theme', 'avada_lang_setup');

// Register Custom Post Type: Filières
function filieres_post_type() {
    $labels = array(
        'name' => _x('Filières', 'Post Type General Name', 'avada'),
        'singular_name' => _x('Filière', 'Post Type Singular Name', 'avada'),
        'menu_name' => __('Filières', 'avada'),
    );
    $args = array(
        'label' => __('Filières', 'avada'),
        'public' => true,
        'supports' => array('title'),
        'capability_type' => 'page',
        'has_archive' => true,
        'menu_position' => 5,
    );
    register_post_type('filieres', $args);
}
add_action('init', 'filieres_post_type', 0);

// Register Custom Post Type: Company
function company_post_type() {
    $labels = array(
        'name' => _x('company', 'Post Type General Name', 'avada'),
        'singular_name' => _x('company', 'Post Type Singular Name', 'avada'),
        'menu_name' => __('company', 'avada'),
    );
    $args = array(
        'label' => __('company', 'avada'),
        'public' => true,
        'supports' => array('title', 'thumbnail'),
        'capability_type' => 'page',
        'has_archive' => true,
        'menu_position' => 5,
    );
    register_post_type('company', $args);
}
add_action('init', 'company_post_type', 0);

/** 6. SHORTCODES **/

// Shortcode: [filieres]
function fonction_shortcode_filier_post() {
    query_posts(array('post_type' => 'filieres', 'showposts' => 3));
    $html = '<div class="formation">';
    while (have_posts()): the_post();
        $id = get_the_ID();
        $image = get_field("image");
        $color = get_field("color");
        $url = get_field("url");
        $description = wp_trim_words(get_field("description"), 20);
        $titre = get_the_title();
        $rgba = hex2rgba($color, 0.9);
        $html .= "<style>.formation-$id.nd-wrap:hover .nd-content{background:$rgba;}</style>";
        $html .= '<a href="' . esc_url($url) . '" aria-label="' . esc_attr('Devenez ' . $titre) . '"><div class=" formation-' . esc_attr($id) . ' nd-wrap nd-style-7 fusion-column column col col-lg-4 col-md-4 col-sm-4 col-xs-12">';
        $html .= '<img alt="' . esc_attr($titre) . '" src="' . esc_url($image) . '">';
        $html .= '<div class="nd-content"><div class="bgTitre"><h2>' . esc_html($titre) . '</h2></div><div class="nd-content_inner"><div class="nd-content_inner1"><h3 class="nd-title"><span>' . esc_html($titre) . '</span></h3>';
        $html .= '<span class="nd-icon"><p>' . esc_html($description) . '</p></span><a class="more-icon" href="' . esc_url($url) . '">More</a></div></div></div></div></a>';
    endwhile;
    $html .= '</div>';
    wp_reset_query();
    return $html;
}
add_shortcode('filieres', 'fonction_shortcode_filier_post');

// Shortcode: [infohas_carousel]
function fonction_shortcode_carousel_post() {
    query_posts(array('post_type' => 'company', 'posts_per_page' => -1));
    $html = '<div id="demo"><div class=""><div class="row"><div class="col-lg-12 col-md-12 col-sm-12 col-xs-12"><div id="infohas_company" class="owl-carousel">';
    while (have_posts()): the_post();
        $html .= '<div class="item">' . get_the_post_thumbnail() . '</div>';
    endwhile;
    $html .= '</div><div class="customNavigation"><a class="btn prev">Previous</a><a class="btn next">Next</a></div></div></div></div></div>';
    wp_reset_query();
    return $html;
}
add_shortcode('infohas_carousel', 'fonction_shortcode_carousel_post');

/** 7. UTILITIES & FILTERS **/

// Multilang Selector
function language_selector_flags() {
    $languages = icl_get_languages('skip_missing=0&orderby=code');
    if (!empty($languages)) {
        echo '<ul>';
        foreach ($languages as $l) {
            $class = $l['active'] ? 'activeLang' : '';
            echo '<li>';
            if (!$l['active']) echo '<a class="notActive" href="' . esc_url($l['url']) . '">';
            echo esc_html($l['native_name']);
            if (!$l['active']) echo '</a>';
            echo '</li>';
        }
        echo '</ul>';
    }
}

// Hex to RGBA conversion
function hex2rgba($color, $opacity = false) {
    if (empty($color)) return 'rgb(0,0,0)';
    if ($color[0] == '#') $color = substr($color, 1);
    if (strlen($color) == 6) {
        $hex = array($color[0].$color[1], $color[2].$color[3], $color[4].$color[5]);
    } elseif (strlen($color) == 3) {
        $hex = array($color[0].$color[0], $color[1].$color[1], $color[2].$color[2]);
    } else { return 'rgb(0,0,0)'; }
    $rgb = array_map('hexdec', $hex);
    return $opacity ? 'rgba(' . implode(",", $rgb) . ',' . $opacity . ')' : 'rgb(' . implode(",", $rgb) . ')';
}

// Sidebars
add_action('widgets_init', function() {
    register_sidebar(array(
        'id' => 'unique-sidebar-id',
        'name' => __('footer copyright', 'avada'),
        'before_widget' => '<aside id="%1$s" class="widget %2$s">',
        'after_widget' => '</aside>',
    ));
});

// WebP Support
add_filter('mime_types', function($mimes) { $mimes['webp'] = 'image/webp'; return $mimes; });
add_filter('file_is_displayable_image', function($result, $path) {
    if ($result === false && @getimagesize($path)[2] === IMAGETYPE_WEBP) return true;
    return $result;
}, 10, 2);

// Body Class Language
add_filter('body_class', function($classes) {
    $classes[] = 'infoHas-lang-' . ICL_LANGUAGE_CODE;
    return $classes;
});

// Image Sizes
add_action('after_setup_theme', function() {
    remove_image_size('recent-posts');
    add_image_size('recent-posts', 346, 200, true);
}, 11);

// AMP Font Awesome
add_action('amp_post_template_head', function() {
    echo '<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.0.9/css/all.css">';
});
