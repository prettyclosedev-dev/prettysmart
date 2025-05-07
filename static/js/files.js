$(document).on('click', '[data-toggle="modal"]', function(){
    var target = $(this).data('target');

    $('body').addClass('modal-open');
    $('.modal-backdrop').addClass('show d-block');
    $(target).addClass('show d-block');

    return false;

}).on('click', '.modal .close', function(){
    closeFileModal();

    return false;

}).on('keyup', '[name="search"]', function(){

    clearTimeout(window.searchTimeOut);
    window.searchTimeOut = setTimeout(function(){
        var val = $('[name="search"]').val();

        $('.unsplash-container').data('page', '1');
        getUnsplashImages(val, 1);
    }, 500);

}).on('click', '[data-key]', function(){

    $(this).addClass('selected').siblings().removeClass('selected');
    $('[data-insert]').attr('disabled', false)

}).on('click', '[data-insert]', function(){

    var selectedFile = $('.unsplash-card.selected').data('url'),
        thumbnail = $('.unsplash-card.selected img').attr('src');

    if(selectedFile){
        $('[name="form_file"]').val(selectedFile);
        $('.form-file-upload').addClass('d-none');
        $('.form-file-uploaded').removeClass('d-none').find('.file-preview').css('background-image','url('+ thumbnail +')');
    }

    closeFileModal();

    return false;
}).on('click', '[data-remove]', function() {
    $('[name="form_file"]').val('');
    $('.form-file-upload').removeClass('d-none');
    $('.form-file-uploaded').addClass('d-none').find('.file-preview').css('background-image','');

    return false;

}).on('change', '[name="file"]', function() {
    if(!$(this).val()){
        return;
    }

    var formData = new FormData();

    formData.append('file', $(this)[0].files[0]);

    uploadFile(formData);    

}).on('keyup input', '[maxlength]', function(){
    var max = Number($(this).attr('maxlength')),
        val = $(this).val(),
        typed = val.length,
        reachedMax = typed >= max;

    if(reachedMax){
        $(this).next().find('.maximum-characters-info-counter').text(typed + '/' + max).hide()
        $(this).next().find('.maximum-characters-info-reached').show()
    }else{
        $(this).next().find('.maximum-characters-info-counter').text(typed + '/' + max).show()
        $(this).next().find('.maximum-characters-info-reached').hide()
    }
        
}).on("click", '#new-form-submit', function() {
    $("#new-form").submit();
});

// $('html').on("dragover", function(e) {
//     e.preventDefault();
//     e.stopPropagation();
//     $(".file-upload").addClass("dragover");
//  }).on("drop", function(e) { 
//      e.preventDefault(); 
//      e.stopPropagation(); 
// });

// $(".file-upload").on('dragenter', function (e) {
//     e.stopPropagation();
//     e.preventDefault();
//     $(this).addClass("drop");
// }).on('dragover', function (e) {
//     e.stopPropagation();
//     e.preventDefault();
//     $(".file-upload").addClass("drop");
// }).on('drop', function (e) {
//     e.stopPropagation();
//     e.preventDefault();

//     $(".file-upload").removeClass("drop dragover");

//     var file = e.originalEvent.dataTransfer.files;
//     var formData = new FormData();

//     formData.append('file', file[0]);

//     uploadFile(formData);
// });

$('.unsplash-container').on('scroll', function(){
    var elem = $(this);
    if(elem[0].scrollHeight - elem.scrollTop() === Math.round(elem.outerHeight())){
        var page = $('.unsplash-container').data('page');

        if(!page){
            page = 1;
        }else{
            page = Number(page) + 1;
        }

        $('.unsplash-container').data('page', page);

        getUnsplashImages($('[name="search"]').val(), page)
    }
});

$('textarea').each(function(){
    //var plceholder = $(this).val();
    //$(this).height(this.scrollHeight).val('').attr('placeholder', plceholder);
    var showValue = $(this).data('show-value'),
        value = $(this).data('value');

    if(showValue){
        $(this).val(value)
    }else{
        $(this).attr('placeholder', value);
    }
});

function closeFileModal(){
    $('body').removeClass('modal-open');
    $('.modal-backdrop').removeClass('show d-block');
    $('.modal-backdrop').remove();
    $('#fileModal').removeClass('show d-block');
    $('.modal-backdrop').add();
    $('#fileModal').modal('hide');
}

function uploadFile(formData){
    $('.file-loader').removeClass('d-none');

    $.ajax({
        url: '/library/upload',
        data: formData,
        contentType: false,
        processData: false,
        cache: false,
        type: 'POST',
        success: function(data) {
            try {
                console.log("data.path", data);
                $('[name="form_file"]').val(data.path);
                $('.form-file-upload').addClass('d-none');
                $('.form-file-uploaded').removeClass('d-none');
                $('.form-file-uploaded').find('.file-preview').css('background-image',"url('" + data.path + "')");
                $('.form-file-uploaded').find('.file-preview').css('cursor','pointer');
                $('#img-preview').attr('src', data.path);
                $('#img-preview').removeClass('d-none');
    
                setTimeout(() => {
                    closeFileModal();
                    $('.file-loader').addClass('d-none');
                    $('[data-insert]').attr('disabled', false)
                }, 100);
            } catch (error) {
                console.log("error on success", error);
            }            
        },
        error: function(data) {
            console.error(data);

            setTimeout(() => {
                closeFileModal();
                $('.file-loader').addClass('d-none');
            }, 100);
        }
     });
}

function getUnsplashImages(val, page){

    if(!val){
        $('.unsplash-list').empty()
        return;
    }

    $.get('/unsplash?q=' + val + '&page=' + page, function(res){
        if(page === 1){
            $('.unsplash-list').empty()
        }
        res.results.forEach(function(pic){
            $('.unsplash-list').append(`
                <div class="unsplash-card" data-key="${pic.id}" data-url="${pic.urls.full}">
                    <img
                        class="unsplash-image"
                        alt="${pic.alt_description}"
                        src="${pic.urls.thumb}&utm_source=prettysmart&utm_medium=form"
                    ></img>
                    <a href="${pic.user.links.html}&utm_source=prettysmart&utm_medium=form" target="blank" class="unsplash-image-user">${pic.user.name}</a>
                </div>
            `)
        })
    });
}