const url = 'katalog.pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

let pdfDoc = null,
    flipbook = $('#flipbook'),
    lastHighlightedPage = -1; // Paměť, kde jsme naposledy zvýrazňovali

function resizeBook(initialViewport) {
    const containerWidth = $('#canvas-container').width() * 0.99;
    const containerHeight = $('#canvas-container').height() * 0.99;
    const pageRatio = initialViewport.width / initialViewport.height;
    
    let bookHeight = containerHeight;
    let bookWidth = bookHeight * pageRatio * 2;
    
    if (bookWidth > containerWidth) {
        bookWidth = containerWidth;
        bookHeight = bookWidth / (pageRatio * 2);
    }
    
    return { width: bookWidth, height: bookHeight, ratio: pageRatio };
}

// --- UPRAVENÁ FUNKCE VYHLEDÁVÁNÍ SE ZVÝRAZNĚNÍM ---
function executeSearch() {
    const query = $('#search-input').val().toLowerCase().trim();
    if (!query || !pdfDoc) return;

    // Odstraníme stará zvýraznění, pokud existují
    $('.highlight').removeClass('highlight');

    const numPages = pdfDoc.numPages;
    let found = false;

    // Procházíme stránky
    for (let i = 1; i <= numPages; i++) {
        pdfDoc.getPage(i).then(page => {
            page.getTextContent().then(textContent => {
                const pageText = textContent.items.map(item => item.str).join(' ').toLowerCase();
                
                if (pageText.includes(query) && !found) {
                    found = true;
                    // Otočíme na stránku
                    $('#flipbook').turn('page', i);
                    lastHighlightedPage = i; // Uložíme si, kde jsme slovo našli
                    
                    // Malý efekt potvrzení úspěchu
                    $('.search-box').css('background-color', 'rgba(0, 118, 55, 0.85)');
                    setTimeout(() => $('.search-box').css('background-color', 'rgba(51, 51, 51, 0.85)'), 500);

                    // --- ZVÝRAZNĚNÍ V TEXTLAYERU ---
                    // Chvíli počkáme, než se Turn.js ustálí
                    setTimeout(() => {
                        const targetPageDiv = $('.page').eq(i-1); // Správný DIV stránky
                        const textLayer = targetPageDiv.find('.textLayer'); // Textová vrstva v něm
                        
                        // Projdeme všechny <span>y v TextLayeru a zvýrazníme ten se slovem
                        textLayer.find('span').each(function() {
                            if ($(this).text().toLowerCase().includes(query)) {
                                $(this).addClass('highlight'); // Přidáme CSS třídu
                            }
                        });
                    }, 300); // 300ms prodleva, aby byla stránka stabilní
                }
            });
        });
        if (found) break;
    }
}
// ----------------------------------------------------

pdfjsLib.getDocument(url).promise.then(pdf => {
    pdfDoc = pdf;
    const numPages = pdf.numPages;
    
    $('#btn-end').attr('onclick', `$('#flipbook').turn('page', ${numPages})`);
    
    pdf.getPage(1).then(firstPage => {
        const initialViewport = firstPage.getViewport({ scale: 1.0 });
        const dimensions = resizeBook(initialViewport);
        
        flipbook.css({ width: dimensions.width, height: dimensions.height });

        let renderedPages = 0;

        // Vykreslujeme stránky (Canvas + TextLayer)
        for (let i = 1; i <= numPages; i++) {
            const pageDiv = $('<div class="page"></div>');
            const canvas = document.createElement('canvas');
            
            // --- NOVINKA: VYTVOŘENÍ TEXTLAYERU ---
            const textLayerDiv = $('<div class="textLayer"></div>');
            
            pageDiv.append(canvas);
            pageDiv.append(textLayerDiv); // Přidáme textlayer DO stránky
            
            flipbook.append(pageDiv);

            pdf.getPage(i).then(page => {
                const pageTargetWidth = dimensions.width / 2;
                const pageViewport = page.getViewport({ scale: 1.0 });
                const scale = (pageTargetWidth / pageViewport.width) * 1.5; 
                const viewport = page.getViewport({ scale: scale });
                
                // Vykreslení grafiky (Canvas)
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                
                // Spustíme vykreslení canvasu
                const renderTask = page.render(renderContext);
                
                renderTask.promise.then(() => {
                    renderedPages++;
                    
                    // --- NOVINKA: VYSTAVĚNÍ TEXTLAYERU ---
                    // Musíme textlayeru nastavit přesně rozměry canvasu
                    textLayerDiv.css({ width: viewport.width, height: viewport.height });

                    page.getTextContent().then(textContent => {
                        // Použijeme standardní funkci pdf.js k vystavění textové vrstvy
                        pdfjsLib.renderTextLayer({
                            textContent: textContent,
                            container: textLayerDiv[0], // DOM element kontejneru
                            viewport: viewport, // Musí mít stejný scale jako canvas
                            textDivs: [] // Vnitřní paměť pro pdf.js
                        });
                    });
                    // --------------------------------------

                    if (renderedPages === numPages) {
                        // Inicializace flipbooku
                        flipbook.turn({
                            width: dimensions.width,
                            height: dimensions.height,
                            elevation: 50,
                            gradients: true,
                            autoCenter: true
                        });
                        
                        window.addEventListener('wheel', function(e) {
                            if (e.deltaY > 0) { flipbook.turn('next'); } 
                            else if (e.deltaY < 0) { flipbook.turn('previous'); }
                        }, { passive: true });
                    }
                });
            });
        }
    });
});

$(window).resize(function() {
    if (pdfDoc) {
        pdfDoc.getPage(1).then(page => {
            const initialViewport = page.getViewport({ scale: 1.0 });
            const dimensions = resizeBook(initialViewport);
            flipbook.turn('size', dimensions.width, dimensions.height);
        });
    }
});
