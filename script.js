const url = 'BMplus_katalog_2024_blok_CZ.pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

let pdfDoc = null,
    flipbook = $('#flipbook');

function resizeBook(initialViewport) {
    // Necháme drobnou rezervu (96 %), aby vynikl ten hezký stín okolo celé knihy
    const containerWidth = $('#canvas-container').width() * 0.96;
    const containerHeight = $('#canvas-container').height() * 0.96;
    const pageRatio = initialViewport.width / initialViewport.height;
    
    let bookHeight = containerHeight;
    let bookWidth = bookHeight * pageRatio * 2;
    
    if (bookWidth > containerWidth) {
        bookWidth = containerWidth;
        bookHeight = bookWidth / (pageRatio * 2);
    }
    
    return { width: bookWidth, height: bookHeight, ratio: pageRatio };
}

function executeSearch() {
    const query = $('#search-input').val().toLowerCase().trim();
    if (!query || !pdfDoc) return;

    const numPages = pdfDoc.numPages;
    let found = false;

    for (let i = 1; i <= numPages; i++) {
        pdfDoc.getPage(i).then(page => {
            page.getTextContent().then(textContent => {
                const pageText = textContent.items.map(item => item.str).join(' ').toLowerCase();
                if (pageText.includes(query) && !found) {
                    found = true;
                    $('#flipbook').turn('page', i);
                    $('.search-box').css('background-color', 'rgba(0, 118, 55, 0.85)');
                    setTimeout(() => $('.search-box').css('background-color', 'rgba(40, 40, 40, 0.85)'), 500);
                }
            });
        });
        if (found) break;
    }
}

pdfjsLib.getDocument(url).promise.then(pdf => {
    pdfDoc = pdf;
    const numPages = pdf.numPages;
    
    $('#btn-end').attr('onclick', `$('#flipbook').turn('page', ${numPages})`);
    
    pdf.getPage(1).then(firstPage => {
        const initialViewport = firstPage.getViewport({ scale: 1.0 });
        const dimensions = resizeBook(initialViewport);
        
        flipbook.css({ width: dimensions.width, height: dimensions.height });

        let renderedPages = 0;

        for (let i = 1; i <= numPages; i++) {
            const pageDiv = $('<div class="page"></div>');
            const canvas = document.createElement('canvas');
            pageDiv.append(canvas);
            flipbook.append(pageDiv);

            pdf.getPage(i).then(page => {
                const pageTargetWidth = dimensions.width / 2;
                const pageViewport = page.getViewport({ scale: 1.0 });
                const scale = (pageTargetWidth / pageViewport.width) * 1.5; 
                const viewport = page.getViewport({ scale: scale });
                
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                
                page.render(renderContext).promise.then(() => {
                    renderedPages++;
                    if (renderedPages === numPages) {
                        // --- INICIALIZACE S PROFI STÍNY ---
                        flipbook.turn({
                            width: dimensions.width,
                            height: dimensions.height,
                            elevation: 60,
                            gradients: true,
                            duration: 1500, // Mírně hladší a plynulejší animace otočení
                            shadows: true,  // Aktivace stínů pod rukou / listem
                            autoCenter: true
                        });
                        
                        window.addEventListener('wheel', function(e) {
                            if (e.deltaY > 0) {
                                flipbook.turn('next');
                            } else if (e.deltaY < 0) {
                                flipbook.turn('previous');
                            }
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
