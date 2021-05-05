//const baseApi = 'http://romagna.lan/api/';
const baseApi = 'https://romagnaimpianti.wp-demo.eu/api/';
const directionsApi = 'https://api.openrouteservice.org/';
var initializedPages = [];
var pictureSource;
var destinationType;
var retries = 0;
var app = {
    // Application Constructor
    initialize: function() {
        remember = window.localStorage.getItem("remember");
        email = window.localStorage.getItem("email");
        password = window.localStorage.getItem("password");
        $form = $("#login").find('form');
        if (remember) {
            $form.find("#password").val(password);
            $form.find("#email").val(email);
        }
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
        document.addEventListener("offline", onOffline, false);
        document.addEventListener("online", onOnline, false);
        $(document).on("pagecreate", function(event) {
            initializedPages.push($(event.target).attr('id'));
        });
        $.mobile.navigate("#login");
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {
        this.receivedEvent('deviceready');
        pictureSource = navigator.camera.PictureSourceType;
        destinationType = navigator.camera.DestinationType;
        //vengono assegnate delle azioni al send ed al complete di ogni chiamata ajax (lo faccio qui per non doverlo fare in tutte le chiamate)
        $(document).ajaxSend(function(event, jqXHR, ajaxOptions) {
            if (ajaxOptions.showLoadingSpinner) { //se showLoadingSpinner è true nelle opzioni passate all ajax, quando parte la chiamata mostra lo spinner
                window.plugins.spinnerDialog.show(null, null, true);
            }
        }).ajaxComplete(function(event, jqXHR, ajaxOptions) {
            if (ajaxOptions.showLoadingSpinner) { //se showLoadingSpinner è true nelle opzioni passate all ajax, quando finisce la chiamata nasconde lo spinner
                window.plugins.spinnerDialog.hide();
            } //se la chiamata ritorna uno status 403 mostro un toast con l'errore
            if (jqXHR.status === 403) { // utente non abilitato
                showToast(jqXHR.responseJSON.error, true, "short");
            }
        });
    },

    // Update DOM on a Received Event
    receivedEvent: function(id) {
    }
};

app.initialize();

//viene chiamata quando c'è una perdita di connessione
function onOffline() {
    showToast('Attenzione: connessione internet persa, verifica la connettività prima di continuare', true, "long");
}

//viene chiamata quando ci si riallaccia alla connessione
function onOnline() {
    showToast('Connessione internet attiva', false);
}

//funzione per toast di error/success
function showToast(message, isError, duration) {
    backgroundColor = (isError) ? '#a94442' : '#3c763d';
    window.plugins.toast.showWithOptions({
        message: message,
        duration: duration,
        position: "bottom",
        styling: {
            //opacity: 0.75, // 0.0 (transparent) to 1.0 (opaque). Default 0.8
            backgroundColor: backgroundColor, // make sure you use #RRGGBB. Default #333333
            //textColor: '#FFFFFF', // Ditto. Default #FFFFFF
            //textSize: 13, // Default is approx. 13.
            //cornerRadius: 16, // minimum is 0 (square). iOS default 20, Android default 100
            //horizontalPadding: 10, // iOS default 16, Android default 50
            //verticalPadding: 8 // iOS default 12, Android default 30
        }
    });
}
//funzione per controllo istantaneo della connessione
function connected() {
    return !(navigator.connection.type == Connection.NONE || navigator.connection.type == Connection.UNKNOWN);
}

function faiLogin($element, e){
    e.preventDefault();
    if (!connected()) {
        showToast('Attenzione, non hai una connessione ad internet attiva', true, "short");
        return;
    }
    $form = $element.closest('form');
    $form.find('.error').remove();
    $.ajax({
        showLoadingSpinner: true,
        url: baseApi+"login",
        type: 'POST',
        data: $form.serializeArray(),
        dataType: "json",
        success: function (data, status){ //status 200 
            if (data.utente) {
                remember = $form.find('#remember').is(':checked');
                email = $form.find('#email').val();
                password = $form.find('#password').val();
                window.localStorage.setItem("remember", remember);
                if (remember) {
                    window.localStorage.setItem("email", email);
                    window.localStorage.setItem("password", password);
                } else {
                    window.localStorage.removeItem("email");
                    window.localStorage.removeItem("password");
                }
                user_id = data.utente.id;
                token = data.utente.api_token;
                nomeCompleto = data.utente.name + " " + data.utente.surname;
                richiediLavorazioni(moment().format('YYYY-MM-DD'));
            } else {
                $element.after('<span class="error">Credenziali non corrispondenti ai dati registrati o account non abilitato al login.</span>');
            }
        },
        error: function(xhr, status, error) { //status non 200: errori di validazione o autenticazione
            if (xhr.responseJSON.email) {
                $element.after('<span class="error">'+xhr.responseJSON.email+'</span>');
            } else {
                errorSpans = [];
                $.each(xhr.responseJSON.errors, function(i, error) {
                    errorSpans.push('<span class="error"><strong>'+i.toUpperCase()+': </strong>'+error+'</span>');
                });
                $element.after(errorSpans.join('<br>'));
            }
        }
    });
}


function richiediLavorazioni(data){
    if (!connected()) {
        showToast('Attenzione, non hai una connessione ad internet attiva', true, "short");
        return;
    }
    formatted = (data) ? moment(data, 'YYYY-MM-DD').format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
    $.ajax({
        showLoadingSpinner: true,
        url: baseApi+"processings",
        type: 'POST',
        data: { date: formatted },
        // Fetch the stored token from localStorage and set in the header
        headers: {"Authorization": 'Bearer '+ token},
        dataType: "json",
        success: function(data) {
            creaPagina($('#index'), data.rendered); //passo l'id del div che devo popolare e l'html restituito dall'api
        },  //fine success
        error: function(xhr, status, error) {
        }
    });
}
function paginaNota(processing) {
    if (!connected()) {
        showToast('Attenzione, non hai una connessione ad internet attiva', true, "short");
        return;
    }
    $.ajax({
        showLoadingSpinner: true,
        url: baseApi+"processings/note",
        type: 'POST',
        data: { processing: processing },
        // Fetch the stored token from localStorage and set in the header
        headers: {"Authorization": 'Bearer '+ token},
        dataType: "json",
        success: function(data) {
            creaPagina($('#nota'), data.rendered); //passo l'id del div che devo popolare e l'html restituito dall'api
        },  //fine success
        error: function(xhr, status, error) {
        }
    });
}
function salvaNota(processing) {
    $('.error').remove();
    if (!connected()) {
        showToast('Attenzione, non hai una connessione ad internet attiva', true, "short");
        return;
    }
    $.ajax({
        showLoadingSpinner: true,
        url: baseApi+"processings/note/save",
        type: 'POST',
        data: { 
            processing: processing, 
            text: $('textarea').val(), 
            image: $('#preview').attr('src') || null,
        },
        // Fetch the stored token from localStorage and set in the header
        headers: { "Authorization": 'Bearer '+ token },
        dataType: "json",
        success: function(data) {
            //torno alla pagina delle lavorazioni
            showToast('Nota lavorazione salvata con successo', false, "short");
            $.mobile.navigate('#index');
        },  //fine success
        error: function(xhr, status, error) {
            if (xhr.status !== 403) {
                showToast('Correggi gli errori e riprova', true, "short");
                $.each(JSON.parse(xhr.responseJSON.errors), function(i, error) {
                    $('textarea').before('<span class="error">'+error+'</span>');
                });
            }
        }
    });
}

function paginaPermessi() {
    if (!connected()) {
        showToast('Attenzione, non hai una connessione ad internet attiva', true, "short");
        return;
    }
    $.ajax({
        showLoadingSpinner: true,
        url: baseApi+"permits",
        type: 'POST',
        // Fetch the stored token from localStorage and set in the header
        headers: {"Authorization": 'Bearer '+ token},
        dataType: "json",
        success: function(data) {
            creaPagina($('#permessi'), data.rendered); //passo l'id del div che devo popolare e l'html restituito dall'api
        },  //fine success
        error: function(xhr, status, error) {
        }
    });
}
function richiediPermesso() {
    $('.error').remove();
    if (!connected()) {
        showToast('Attenzione, non hai una connessione ad internet attiva', true, "short");
        return;
    }
    $.ajax({
        showLoadingSpinner: true,
        url: baseApi+"permits/request",
        type: 'POST',
        data: { 
            date: $('[name=year]').val() + "-" + $('[name=month]').val() + "-" + $('[name=day]').val(), 
        },
        // Fetch the stored token from localStorage and set in the header
        headers: { "Authorization": 'Bearer '+ token },
        dataType: "json",
        success: function(data) {
            //torno alla pagina delle lavorazioni
            showToast('Richiesta inviata', false, "short");
            $.mobile.navigate('#index');
        },  //fine success
        error: function(xhr, status, error) {
            if (xhr.status !== 403) {
                showToast('Correggi gli errori e riprova', true, "short");
                $.each(JSON.parse(xhr.responseJSON.errors), function(i, error) {
                    $('[name=year]').after('<span class="error">'+error+'</span>');
                });
            }
        }
    });
}
function paginaRapportino(cell, processing) {
    if (!connected()) {
        showToast('Attenzione, non hai una connessione ad internet attiva', true, "short");
        return;
    }
    $.ajax({
        showLoadingSpinner: true,
        url: baseApi+"report",
        type: 'POST',
        data: { cell: cell, processing: processing },
        // Fetch the stored token from localStorage and set in the header
        headers: {"Authorization": 'Bearer '+ token},
        dataType: "json",
        success: function(data) {
            creaPagina($('#rapportino'), data.rendered, function() {
                travel_time = 0;
                if ($.mobile.activePage.attr('id') == 'rapportino') { //se la pagina è attiva, calcolo i tempi di percorrenza
                    $('[data-route]').each(function() {
                        span = $(this).find('span.part-time');
                        coordinates = $(this).data('route')['from'].lng+","+$(this).data('route')['from'].lat+"|"+$(this).data('route')['to'].lng+","+$(this).data('route')['to'].lat;
                        if (coordinates) {
                            if (!connected()) {
                                showToast('Attenzione, non hai una connessione ad internet attiva', true, "short");
                                return;
                            }
                            $.ajax({
                                showLoadingSpinner: false, //questa chiamata non scatena lo spinner, viene fatta in background non c'è bisogno di bloccare l'UI
                                type: "GET",
                                url: directionsApi+'directions',
                                data: 'api_key=58d904a497c67e00015b45fc286edbe494104a3fa237d2e7e1fe3a8b&coordinates='+coordinates+'&profile=driving-car&preference=fastest&units=km&language=it&geometry=true&geometry_format=geojson&instructions=true&instructions_format=html&options=%7B%22maximum_speed%22%3A130%7D', 
                                dataType: "json",
                                async: false,
                                timeout: 5000,
                                success: function (data, status) {
                                    $.each(data.routes[0].segments, function (i, item) {
                                        routeTime = "";
                                        durata = Math.floor(item['duration'] * 1.1);
                                        if(durata > 0) {
                                            hours = 0;
                                            if(durata > 3600){
                                              hours = Math.floor(durata / 3600);
                                              durata = durata - hours * 3600;
                                            }
                                            minutes = Math.floor(durata / 60);
                                            travel_time += minutes;
                                            $('span.full-time').text(travel_time);
                                            span.text(minutes);
                                        }
                                    });
                                }
                            });
                        }
                    });
                    if ($('input[name=tempo_di_viaggio]').val().length === 0) {
                        $('input[name=tempo_di_viaggio]').val(travel_time);
                    }
                }
                minValues = [];
                $('input[data-type="range"]').each(function() { //serve per bloccare gli slider ad un minimo
                    minValues[$(this).attr('id')] = parseInt($(this).val());
                    $(this).on("slidestop", function( event, ui ) { //questo viene chiamato solo se trascino lo slider
                        if (parseInt($(this).val()) < minValues[$(this).attr('id')]) {
                            $(this).val(minValues[$(this).attr('id')]).change();
                        }
                    });
                    $(this).on("input", function() { // questo viene chiamato solo se cambio il numero nell input
                        if (parseInt($(this).val()) < minValues[$(this).attr('id')]) {
                            $(this).val(minValues[$(this).attr('id')]).change();
                        }
                    });
                });
                //calcolo tempi lavorati/da rendicontare
                tot_time = 0;
                $("input[id^='daily-time-']").each(function() {
                    if ($(this).val()) {
                        tot_time += parseFloat($(this).val());
                    }
                });
                $('#tot-time').text(tot_time);
                tot_time_empl = 0;
                $("input[id^='employee-']").each(function() {
                    if ($(this).val()) {
                        tot_time_empl += parseFloat($(this).val());
                    }
                });
                $('#tot-time-empl').text(tot_time_empl);
                $('#da-assegnare-time').text(parseFloat($('#tot-time-empl').text())-parseFloat($('#tot-time').text()));
                if($('#da-assegnare-time').text()==0) {
                    $('.time').addClass('banner-ok').removeClass('banner');
                    $('#save-button').attr('disabled', false);
                } else {
                    $('.time').addClass('banner').removeClass('banner-ok');
                    $('#save-button').attr('disabled', true);
                }

                //al momento dell'aggiornamento ore attività
                $("input[id^='daily-time-']").on('input', function() {
                    tot_time = 0;
                    $("input[id^='daily-time-']").each(function() {
                        if ($(this).val()) {
                            tot_time += parseFloat($(this).val());
                        }
                    });
                    $('#tot-time').text(tot_time);
                    $('#da-assegnare-time').text(parseFloat($('#tot-time-empl').text())-parseFloat($('#tot-time').text()));
                    if($('#da-assegnare-time').text()==0) {
                        $('.time').addClass('banner-ok').removeClass('banner');
                        $('#save-button').attr('disabled', false);
                    } else {
                        $('.time').addClass('banner').removeClass('banner-ok');
                        $('#save-button').attr('disabled', true);
                    }
                });

                //al momento dell'aggiornamento ore lavoratori
                $("input[id^='employee-']").on('input', function() {
                    tot_time_empl = 0;
                    $("input[id^='employee-']").each(function() {
                        if ($(this).val()) {
                            tot_time_empl += parseFloat($(this).val());
                        }
                    });
                    $('#tot-time-empl').text(tot_time_empl);
                    $('#da-assegnare-time').text(parseFloat($('#tot-time-empl').text())-parseFloat($('#tot-time').text()));
                    if($('#da-assegnare-time').text()==0) {
                        $('.time').addClass('banner-ok').removeClass('banner');
                        $('#save-button').attr('disabled', false);
                    } else {
                        $('.time').addClass('banner').removeClass('banner-ok');
                        $('#save-button').attr('disabled', true);
                    }
                });
            });
        },  //fine success
        error: function(xhr, status, error) {
        }
    });
}
function salvaReport(cell, processing, e) {
    e.preventDefault();
    $('.error').remove();
    if (!connected()) {
        showToast('Attenzione, non hai una connessione ad internet attiva', true, "short");
        return;
    }
    if (confirm("Ricordati di inserire le quantit\xE0 lavorate e di far firmare il foglio delle lavorazioni extra se necessario")) {
        $form = $('form');
        formData = $form.serializeArray();
        formData.push({name: "processing", value: processing});
        formData.push({name: "cell", value: cell});
        formData.push({name: "text", value: $('textarea').val()});
        formData.push({name: "image", value: $('#preview').attr('src')});
        console.log(formData);
        $.ajax({
            showLoadingSpinner: true,
            url: baseApi+"report/save",
            type: 'POST',
            data: formData,
            // Fetch the stored token from localStorage and set in the header
            headers: {"Authorization": 'Bearer '+ token},
            dataType: "json",
            success: function(data) {
                //torno alla pagina delle lavorazioni
                showToast('Dati rapportino salvati con successo', false, "short");
                $.mobile.navigate('#index');
            },  //fine success
            error: function(xhr, status, error) {
                if (xhr.status !== 403) { // utente non abilitato
    
                    showToast('Correggi gli errori e riprova', true, "short");
                    focus = true;
                    $.each(JSON.parse(xhr.responseJSON.errors), function(i, error) {
                        if (i.indexOf('.') != -1) // è un input tipo array, devo riformattare il nome
                        {
                            key = i.split('.')[0]+"["+i.split('.')[1]+"]";
                        } else {
                            key = i;
                        }
                        $input = $form.find("[name='"+key+"']");
                        $input.closest('div').before('<span class="error">'+error[0]+'</span>');
                        if (focus) {
                            $input.closest('[data-role=collapsible]').collapsible('expand');
                            $input.focus();
                            focus = false;
                        }
                    });
                }
            }
        });
    } else {
        return;
    }
}
function creaPagina($page, html, callback) { //funzione che carica html ricevuto dall'api dentro il rispettivo div
    if (initializedPages.indexOf($page.attr('id')) != -1) { //se la pagina è già stata inizializzata in precedenza devo distruggerla per poi reinizializzarla
        $page.page('destroy');
    }
    // l'api mi passa già tutto l'html
    $page.html(html);
    if (typeof callback == "function")  { //se ho un callback (ad esempio funzione che mi imposta il minimo negli slider), la eseguo al pageshow
        $(document).on("pageshow", function() {
            callback();
        });
    }
    $page.page();
    $.mobile.navigate('#'+$page.attr('id'));
}

function clearCache() {
    navigator.camera.cleanup();
}

// function to run after user successfully takes a photo or selects
function onCapturePhoto(dataURI) {

    toDataURL(dataURI, function(dataUrl) {
        console.log(dataUrl);
        document.getElementById("imageSelected").innerHTML = '<img id="preview" src="' + dataUrl + '"/>';
    });
}
// function runs when the user cancels the camera or gallery selection
function onFail(message) {
    //alert(message);
}
// Photo Upload
var photoUpload = {
    camera: function() {
        navigator.camera.getPicture(onCapturePhoto, onFail, {
            quality: 50, // photo quality
            destinationType: destinationType.FILE_URI,
            sourceType: Camera.PictureSourceType.CAMERA,
            encodingType: Camera.EncodingType.JPEG
        });
    },
    gallery: function() {
        navigator.camera.getPicture(onCapturePhoto, onFail, {
            quality: 50,
            destinationType: destinationType.FILE_URI,
            sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
            encodingType: Camera.EncodingType.JPEG
        });
    }
}

function toDataURL(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function() {
    var reader = new FileReader();
    reader.onloadend = function() {
      callback(reader.result);
    }
    reader.readAsDataURL(xhr.response);
  };
  xhr.open('GET', url);
  xhr.responseType = 'blob';
  xhr.send();
}

