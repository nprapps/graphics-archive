var url = "https://apps.npr.org/dailygraphics/graphics/fonts/js/lib/webfont.js";
var script = document.createElement("script");
script.src = url;
document.head.appendChild(script);
script.onload = function () {
    WebFont.load({
        custom: {
            families: [
                'Lato:n4,n9,i4,i9',
                'Source+Sans+Pro:n6'
            ],
            urls: [
                'https://s.npr.org/templates/css/fonts/Lato.css',
                'https://s.npr.org/templates/css/fonts/SourceSansPro.css'
            ]
        },
        timeout: 10000
    });
};