<?php

/** Declaration theme child **/
function theme_enqueue_styles() {
    // Child theme stylesheet — no need to enqueue parent-style separately.
    // Avada loads its own compiled CSS via fusion-styles; enqueueing parent/style.css
    // would create an extra blocking HTTP request for a near-empty file.
    wp_enqueue_style('infohas-style', get_stylesheet_directory_uri() . '/style.css', array(), null);

    // OWL Carousel CSS — load conditionally on front page only (P2 fix).
    // Uses media="print" + onload swap trick to make them NON-render-blocking:
    // browser downloads them at low priority, then switches to media="all" after load.
    if (is_front_page()) {
        wp_enqueue_style('owl-carousel',    get_stylesheet_directory_uri() . '/assets/carousel/css/owl.carousel.css',    array(), null, 'print');
        wp_enqueue_style('owl-theme',       get_stylesheet_directory_uri() . '/assets/carousel/css/owl.theme.css',       array(), null, 'print');
        wp_enqueue_style('owl-transitions', get_stylesheet_directory_uri() . '/assets/carousel/css/owl.transitions.css', array(), null, 'print');
    }

    wp_enqueue_script('infohas-custom-js',  get_stylesheet_directory_uri() . '/assets/js/infohas.js',           array(), '1.0.0', true);
    wp_enqueue_script('passive-listeners',  get_stylesheet_directory_uri() . '/assets/js/passive-listeners.js', array(), null,    true);
}
add_action('wp_enqueue_scripts', 'theme_enqueue_styles', 20);

/**
 * Make OWL Carousel stylesheets non-render-blocking:
 * Adds onload="this.media='all'" to the print-media OWL stylesheets
 * so they download async but apply immediately after load.
 */
add_filter('style_loader_tag', 'infohas_owl_async_css', 10, 2);
function infohas_owl_async_css($html, $handle) {
    $async_handles = array('owl-carousel', 'owl-theme', 'owl-transitions');
    if (in_array($handle, $async_handles)) {
        // Add noscript fallback + onload swap
        $noscript = '<noscript>' . str_replace(" media='print'", '', $html) . '</noscript>';
        $html = str_replace(
            "media='print'",
            "media='print' onload=\"this.media='all'\"",
            $html
        );
        return $html . $noscript;
    }
    return $html;
}

/**
 * P1 FIX — LCP Preload + self-hosted font preloads
 *
 * Avada 7.15.2 self-hosts Google Fonts via /fusion-gfonts/.
 * DO NOT preconnect to fonts.googleapis.com — those origins are never used
 * and flagged by Lighthouse as "unused preconnects" (net negative).
 *
 * Instead: preload the actual self-hosted woff2 font files and the LCP image.
 * Priority 1 = first thing in <head>, before any other wp_head output.
 */
add_action('wp_head', 'infohas_perf_hints', 1);
function infohas_perf_hints() {
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
    // NOTE: Font-display fix must be done in Avada Admin:
    // Avada → Theme Options → Performance → Font Loading Method → "Swap"
    // DO NOT fix via JS — cssRules iteration causes 530ms TBT (25 score points lost).
}

/**
 * P3 FIX — Inline critical above-the-fold CSS
 * Reduces render-blocking by inlining the minimum CSS needed for the visible header/banner.
 * Runs at priority 2 (after preload hints, before wp_head finishes).
 */
add_action('wp_head', 'infohas_critical_css', 2);
function infohas_critical_css() {
    if (!is_front_page()) return;
    ?>
    <style id="infohas-critical">
        /* Critical above-the-fold CSS — prevents FOUC on header and hero banner */
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
 * A2 FIX — Inject aria-label on social icon links via wp_footer JS
 * Avada 7.x does not expose a PHP filter for social link HTML, so we patch via JS.
 * Targets both the header social icons and the footer social icons.
 */
add_action('wp_footer', 'infohas_social_aria_labels', 99);
function infohas_social_aria_labels() {
    ?>
    <script id="infohas-a11y-fixes">
    (function() {
        // A2 FIX: Add aria-label to social icon links
        var networkLabels = {
            'facebook':'INFOHAS sur Facebook','twitter':'INFOHAS sur Twitter / X',
            'x':'INFOHAS sur X','instagram':'INFOHAS sur Instagram',
            'youtube':'INFOHAS sur YouTube','linkedin':'INFOHAS sur LinkedIn',
            'whatsapp':'INFOHAS sur WhatsApp'
        };
        document.querySelectorAll('.fusion-social-links-header a,.fusion-footer .fusion-social-networks-wrapper a,.fusion-social-networks a').forEach(function(a) {
            if (a.getAttribute('aria-label')) return;
            var network = '';
            a.classList.forEach(function(cls) { var m=cls.match(/^fusion-(.+)$/); if(m) network=m[1].toLowerCase(); });
            a.setAttribute('aria-label', networkLabels[network] || 'Réseau social INFOHAS');
        });

        // A4 FIX: Add role="main" landmark to Avada's #main div
        // Avada uses <div id="main"> instead of <main> — screen readers need role="main"
        var mainDiv = document.getElementById('main');
        if (mainDiv && !mainDiv.getAttribute('role')) {
            mainDiv.setAttribute('role', 'main');
        }
    })();
    </script>
    <?php
}

function avada_lang_setup() {
    $lang = get_stylesheet_directory() . '/languages';
    load_child_theme_textdomain('Avada', $lang);
}
add_action('after_setup_theme', 'avada_lang_setup');

/** Create custom post type "Infohas filières de formation " **/

/*
 * Creating a function to create our CPT
 */
function filieres_post_type() {

    // Set UI labels for Custom Post Type
    $labels = array(
        'name' => _x('Filières', 'Post Type General Name', 'avada'),
        'singular_name' => _x('Filière', 'Post Type Singular Name', 'avada'),
        'menu_name' => __('Filières', 'avada'),
        'parent_item_colon' => __('Parent Filière', 'avada'),
        'all_items' => __('All Filières', 'avada'),
        'view_item' => __('View Filières', 'avada'),
        'add_new_item' => __('Add New Filière', 'avada'),
        'add_new' => __('Add New', 'avada'),
        'edit_item' => __('Edit Filière', 'avada'),
        'update_item' => __('Update Filière', 'avada'),
        'search_items' => __('Search Filière', 'avada'),
        'not_found' => __('Not Found', 'avada'),
        'not_found_in_trash' => __('Not found in Trash', 'avada'),
    );

    // Set other options for Custom Post Type
    $args = array(
        'label' => __('Filières', 'avada'),
        'description' => __('Filières Infohas', 'avada'),
        'labels' => $labels,
        'supports' => array('title'),
        'hierarchical' => false,
        'public' => true,
        'show_ui' => true,
        'show_in_menu' => true,
        'show_in_nav_menus' => true,
        'show_in_admin_bar' => true,
        'menu_position' => 5,
        'can_export' => true,
        'has_archive' => true,
        'exclude_from_search' => false,
        'publicly_queryable' => true,
        'capability_type' => 'page',
    );

    // Registering your Custom Post Type
    register_post_type('filieres', $args);
}

/* Hook into the 'init' action so that the function
 * Containing our post type registration is not
 * unnecessarily executed.
 */
add_action('init', 'filieres_post_type', 0);

/** End Post Type **/

/**  Static Function to get Formation content **/
function fonction_shortcode_filier_post() {
    query_posts(array(
        'post_type' => 'filieres',
        'showposts' => 3,
    ));

    $html = '';
    $html = '<div class="formation">';

    while (have_posts()): the_post();
        $id = get_the_ID();
        $image = get_field("image");
        $color = get_field("color");
        $url = get_field("url");
        //$descriptionFyll = get_field( "description" );
        $description = wp_trim_words(get_field("description"), 20);
        $titre = get_the_title();
        $RgbColor = hexdec($color);

        $rgba = hex2rgba($color, 0.9);

        $style = "<style>.formation-$id.nd-wrap:hover .nd-content{background:$rgba;}</style>";

        $html .= $style;
        $html .= '<a href="' . esc_url($url) . '" aria-label="' . esc_attr('Devenez ' . $titre) . '"><div class=" formation-' . esc_attr($id) . ' nd-wrap nd-style-7 fusion-column column col col-lg-4 col-md-4 col-sm-4 col-xs-12">';
        $html .= '<img alt="' . esc_attr($titre) . '" src="' . esc_url($image) . '">';
        $html .= '<div class="nd-content"><div class="bgTitre"><h2>';
        $html .= esc_html($titre);
        $html .= '</h2></div><div class="nd-content_inner"><div class="nd-content_inner1"><h3 class="nd-title"><span>';
        $html .= esc_html($titre);
        $html .= '</span></h3>';
        $html .= '<span class="nd-icon"><p>';
        $html .= esc_html($description);
        $html .= '</p></span>';
        $html .= '<a class="more-icon" href="' . esc_url($url) . '">More</a>';
        $html .= '</div></div></div></div></a>';
    endwhile;

    $html .= '</div>';
    return $html;
}

add_shortcode('filieres', 'fonction_shortcode_filier_post');

// MULTILANG SELECTOR
function language_selector_flags() {
    $languages = icl_get_languages('skip_missing=0&orderby=code');
    if (!empty($languages)) {
        echo '<ul>';
        foreach ($languages as $l) {
            if (!$l['active']) {
                ?>
                <li>
                    <a class="notActive" href="<?php echo esc_url($l['url']); ?>"><?php echo esc_html($l['native_name']); ?></a>
                </li>
                <?php
            } elseif ($l['active']) {
                ?>
                <li class="activeLang">
                    <?php echo esc_html($l['native_name']); ?>
                </li>
                <?php
            }
        }
        echo '</ul>';
    }
}

/* Convert hexdec color string to rgb(a) string */
function hex2rgba($color, $opacity = false) {
    $default = 'rgb(0,0,0)';

    // Return default if no color provided
    if (empty($color)) {
        return $default;
    }

    // Sanitize $color if "#" is provided
    if ($color[0] == '#') {
        $color = substr($color, 1);
    }

    // Check if color has 6 or 3 characters and get values
    if (strlen($color) == 6) {
        $hex = array($color[0] . $color[1], $color[2] . $color[3], $color[4] . $color[5]);
    } elseif (strlen($color) == 3) {
        $hex = array($color[0] . $color[0], $color[1] . $color[1], $color[2] . $color[2]);
    } else {
        return $default;
    }

    // Convert hexadec to rgb
    $rgb = array_map('hexdec', $hex);

    // Check if opacity is set(rgba or rgb)
    if ($opacity) {
        if (abs($opacity) > 1) {
            $opacity = 1.0;
        }

        $output = 'rgba(' . implode(",", $rgb) . ',' . $opacity . ')';
    } else {
        $output = 'rgb(' . implode(",", $rgb) . ')';
    }

    // Return rgb(a) color string
    return $output;
}

/**
 * Register Sidebar
 */
function textdomain_register_sidebars() {
    /* Register the primary sidebar. */
    register_sidebar(
        array(
            'id' => 'unique-sidebar-id',
            'name' => __('footer copyright', 'textdomain'),
            'description' => __('Infohas copyright.', 'textdomain'),
            'before_widget' => '<aside id="%1$s" class="widget %2$s">',
            'after_widget' => '</aside>',
            'before_title' => '<h3 class="widget-title">',
            'after_title' => '</h3>',
        )
    );

    /* Repeat register_sidebar() code for additional sidebars. */
}
add_action('widgets_init', 'textdomain_register_sidebars');

add_filter('body_class', 'append_language_class');
function append_language_class($classes) {
    $classes[] = 'infoHas-lang-' . ICL_LANGUAGE_CODE; //or however you want to name your class based on the language code
    return $classes;
}

/** Create custom post type "Infohas Company" **/
function company_post_type() {
    // Set UI labels for Custom Post Type
    $labels = array(
        'name' => _x('company', 'Post Type General Name', 'avada'),
        'singular_name' => _x('company', 'Post Type Singular Name', 'avada'),
        'menu_name' => __('company', 'avada'),
        'parent_item_colon' => __('Parent company', 'avada'),
        'all_items' => __('All company', 'avada'),
        'view_item' => __('View company', 'avada'),
        'add_new_item' => __('Add New company', 'avada'),
        'add_new' => __('Add New', 'avada'),
        'edit_item' => __('Edit company', 'avada'),
        'update_item' => __('Update company', 'avada'),
        'search_items' => __('Search company', 'avada'),
        'not_found' => __('Not Found', 'avada'),
        'not_found_in_trash' => __('Not found in Trash', 'avada'),
    );

    // Set other options for Custom Post Type
    $args = array(
        'label' => __('company', 'avada'),
        'description' => __('company Infohas', 'avada'),
        'labels' => $labels,
        'supports' => array('title', 'thumbnail'),
        'hierarchical' => false,
        'public' => true,
        'show_ui' => true,
        'show_in_menu' => true,
        'show_in_nav_menus' => true,
        'show_in_admin_bar' => true,
        'menu_position' => 5,
        'can_export' => true,
        'has_archive' => true,
        'exclude_from_search' => false,
        'publicly_queryable' => true,
        'capability_type' => 'page',
    );

    // Registering your Custom Post Type
    register_post_type('company', $args);
}

/* Hook into the 'init' action so that the function
 * Containing our post type registration is not
 * unnecessarily executed.
 */
add_action('init', 'company_post_type', 0);

/** End Post Type **/

/**  Static Function to get Formation content **/
function fonction_shortcode_carousel_post() {
    query_posts(array(
        'post_type' => 'company',
        'posts_per_page' => -1,
    ));

    $html = '';
    $html .= '<div id="demo">';
    $html .= '<div class="">';
    $html .= '<div class="row">';
    $html .= '<div class="col-lg-12 col-md-12 col-sm-12 col-xs-12">';
    $html .= '<div id="infohas_company" class="owl-carousel">';

    while (have_posts()): the_post();
        $image = get_the_post_thumbnail();
        $html .= '<div class="item">';
        $html .= $image;
        $html .= '</div>';
    endwhile;

    // navigation
    $html .= '</div>';
    $html .= '<div class="customNavigation">';
    $html .= '<a class="btn prev">Previous</a>';
    $html .= '<a class="btn next">Next</a>';
    $html .= '</div>';
    $html .= '</div>';
    $html .= '</div>';
    $html .= '</div>';
    $html .= '</div>';

    return $html;
}

add_shortcode('infohas_carousel', 'fonction_shortcode_carousel_post');

add_action('after_setup_theme', 'infohas_image_size', 11);
function infohas_image_size() {
    remove_image_size('recent-posts');
    add_image_size('recent-posts', 346, 200, true);
}

add_action('amp_post_template_head', 'infohas_amp_font_awesome');
function infohas_amp_font_awesome() {
    echo '<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.0.9/css/all.css" integrity="sha384-5SOiIsAziJl6AWe0HWRKTXlfcSHKmYV4RBF18PPJ173Kzn7jzMyFuTtk8JA7QQG1" crossorigin="anonymous">';
}

//** *Enable upload for webp image files. */
function webp_upload_mimes($existing_mimes) {
    $existing_mimes['webp'] = 'image/webp';
    return $existing_mimes;
}
add_filter('mime_types', 'webp_upload_mimes');

//** * Enable preview / thumbnail for webp image files. */
function webp_is_displayable($result, $path) {
    if ($result === false) {
        $displayable_image_types = array(IMAGETYPE_WEBP);
        $info = @getimagesize($path);

        if (empty($info)) {
            $result = false;
        } elseif (!in_array($info[2], $displayable_image_types)) {
            $result = false;
        } else {
            $result = true;
        }
    }

    return $result;
}
add_filter('file_is_displayable_image', 'webp_is_displayable', 10, 2);

// Remove Google ReCaptcha code/badge everywhere apart from select pages
add_action('wp_print_scripts', function () {
    if (!is_page(array('contact', 'some-other-page-with-form'))) {
        wp_dequeue_script('google-recaptcha');
    }
});

/**
 * PERFORMANCE FIX — Defer Google Maps JS to contact page only.
 * Avada enqueues the Maps API with handle 'google-map'.
 * This removes 190 KiB of JS from every non-contact page.
 * Using wp_print_scripts (later than wp_enqueue_scripts) to catch
 * scripts registered late by plugins.
 */
add_action('wp_print_scripts', 'infohas_defer_maps', 99);
function infohas_defer_maps() {
    // Get the contact page slug — adjust if your contact page has a different slug
    if (is_page(array('contact', 'contact-fr', 'contact-en', 'nous-contacter'))) return;
    $maps_handles = array(
        'google-map',        // Avada 7.x official handle
        'google-maps',
        'googlemaps',
        'gmaps',
        'google_maps',
        'avada-google-map',
        'fusion-google-map',
    );
    foreach ($maps_handles as $handle) {
        wp_dequeue_script($handle);
        wp_deregister_script($handle);
    }
}

// Start New line here //
