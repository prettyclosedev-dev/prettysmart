var clientWidth = document.documentElement.clientWidth;
/*------------ wowo ------------*/
jQuery('html').addClass("hidden-c");

function getScrollbarWidth() {
	var odiv = document.createElement('div'),
		styles = {
			width: '100px',
			height: '100px',
			overflowY: 'scroll'
		},
		i, scrollbarWidth;
	for (i in styles) odiv.style[i] = styles[i];
	document.body.appendChild(odiv);
	scrollbarWidth = odiv.offsetWidth - odiv.clientWidth;
	jQuery(odiv).remove();
	return scrollbarWidth;
}
jQuery(document).ready(function (jQuery) {
	var scrollBar = clientWidth - jQuery(window).width();
	wowo();
	menuHamburger();
	navscroll();
	slider();
	video();
	bind(jQuery);
	var scw = document.body.scrollWidth;
	var scrollBarW = getScrollbarWidth();
	jQuery(window).scroll(function () {
		wowo();
	});
	getScrollbarWidth();
	jQuery(window).on("load", function () {
		wowo();
	});
	jQuery(window).scroll(function () {
		wowo();
	});
	jQuery(window).resize(function () {
		clientWidth = document.documentElement.clientWidth;
		scrollBar = getScrollbarWidth();
		if (scrollBar + clientWidth >= 991) {
			jQuery('nav').removeClass('active');
			jQuery('.hamburger').removeClass('active');
			jQuery('.menu-c ul li').removeClass('rotate');
			jQuery('.menu-item-has-children').removeClass('active')
			jQuery('.sub-menu').removeAttr('style')
			jQuery('body').css('overflow', 'auto !important')
		}
	});

}).on('submit', 'form', function(e){

	e.preventDefault()
	$(this).slideUp();
	$('.contact-form .title-c h2').slideUp();
	$('.success-message').slideDown()
	return false;
});

function wowo() {
	var wTop = jQuery(window).scrollTop(),
		wHeight = jQuery(window).height(),
		wBottom = wTop + wHeight;
	jQuery(".wowo:not(.animated)").each(function () {
		var me = jQuery(this),
			meTop = me.offset().top,
			meHeight = me.innerHeight(),
			meBottom = meTop + meHeight,
			limitTop = wTop - meHeight,
			limitBottom = wBottom + meHeight;
		if (meTop > limitTop && meBottom < limitBottom) {
			me.addClass("animated");
		}
	});

};

function menuHamburger() {
	jQuery('.header .burger').on('click', function (e) {
		e.preventDefault();
		jQuery('.header nav').toggleClass('is-show');
		jQuery('body').toggleClass('body-hidden');
		jQuery(".burger").toggleClass("active");
	});
	jQuery('body').on('click', 'nav .menu-c .menu-item-has-children', function (e) {
		var sw = document.body.scrollWidth;
		var scrollBar = getScrollbarWidth();
		if (sw + scrollBar <= 991) {
			jQuery(this).toggleClass('rotate');
			jQuery(this).children('.sub-menu').slideToggle(200);
		}
	});
	jQuery(".header .btn-form").append("<i></i>")
}

function navscroll() {
	var scrollTop = jQuery(window).scrollTop();
	if (scrollTop > 30) {
		jQuery('header').addClass('smaller');
	} else {
		jQuery('header').removeClass('smaller');
	}
	jQuery(window).scroll(function (event) {
		var scrollTop = jQuery(window).scrollTop();
		if (scrollTop > 30) {
			jQuery('header').addClass('smaller');
		} else {
			jQuery('header').removeClass('smaller');
		}
	});
}

function slider() {
	if(jQuery('.design-slider').length>0){
		jQuery('.design-slider').slick({
			arrows: false,
			slidesToShow: 7,
			autoplay: true,
			pauseOnHover: false,
			responsive: [
				{
					breakpoint: 1281,
					settings: {
					  slidesToShow: 5,
					}
				  },
				  {
					breakpoint: 961,
					settings: {
					  slidesToShow: 5,
					}
				  },
				  {
					breakpoint: 761,
					settings: {
					  slidesToShow: 4,
					  arrows: false,
					}
				  },
				  {
					breakpoint: 565,
					settings: {
					  slidesToShow: 3,
					  arrows: false,
					}
				  },
				  {
					breakpoint: 414,
					settings: {
					  slidesToShow: 2,
					  arrows: false,
					}
				  },
			
			]
		});
	}
	if(jQuery('.slider-box').length>0){
		jQuery('.slider-box').slick({
			centerMode: true,
			centerPadding: '257px',
			arrows: false,
			slidesToShow: 3,
			autoplay: false,
			pauseOnHover: false,
			focusOnSelect: true,
			responsive: [
				{
					breakpoint: 1660,
					settings: {
					  slidesToShow: 3,
					  centerPadding: '50px',
					}
				  },
				  {
					breakpoint: 1190,
					settings: {
					  slidesToShow: 1,
					  centerPadding: '300px',
					}
				  },
				  {
					breakpoint: 991,
					settings: {
					  slidesToShow: 1,
					  centerPadding: '200px',
					}
				  },
				  {
					breakpoint: 761,
					settings: {
					  slidesToShow: 1,
					  centerPadding: '100px',
					}
				  },
				  {
					breakpoint: 515,
					settings: {
					  slidesToShow: 1,
					  centerPadding: '50px',
					}
				  },
				  {
					breakpoint: 414,
					settings: {
					  slidesToShow: 1,
					  centerPadding: '30px',
					}
				  },
			
			]
		});
	}
	if(jQuery('#slider').length>0){  
		jQuery('#slider').slick({
            slidesToShow: 1,
            slidesToScroll: 1,
            arrows: true,
            dots: false,
            infinite: true,
            speed: 500,
            autoplay: true,
            prevArrow: jQuery('.features-bottom .slick-arrow .arrow-prev'),
            nextArrow: jQuery('.features-bottom .slick-arrow .arrow-next'),
            pauseOnHover: false,
            pauseOnFocus: false,
            autoplaySpeed: 9000,
			adaptiveHeight: true,
			fade: true,
		});
		var list = jQuery('.slider-content .slide-left ul').find('li');

		list.children('a').on('click', function (e) {
            e.preventDefault();
        })

		jQuery('#slider').on('beforeChange', function (event, slick, currentSlide, nextSlide) {
        
            list.eq(nextSlide).addClass('active').siblings().removeClass('active');
        });

        list.on('click', function () {
            var index = jQuery(this).index();
            jQuery(this).addClass('active').siblings().removeClass('active');
            jQuery('#slider').slick('slickGoTo', index, false);
        })
	}
}

function video(){
	jQuery(".video-link.mp4").click(function(event){
		event.preventDefault();
		jQuery(document).bind("mousewheel DOMMouseScroll",function(event){event.preventDefault()});
		jQuery(document).bind("touchmove",function(event){event.preventDefault()});
		var video_url = jQuery(this).find('.data-video').html();
		//jQuery('.video-light-box').find('.play-iframe-video').append('<video controls="controls"><source src="'+video_url+'" type="video/mp4"></video>');
		jQuery('.video-light-box').fadeIn(300);
	});
	jQuery(".video-link.file").click(function(event){
		event.preventDefault();
		jQuery(document).bind("mousewheel DOMMouseScroll",function(event){event.preventDefault()});
		jQuery(document).bind("touchmove",function(event){event.preventDefault()});
		var video_url = jQuery(this).find('.data-video').html();
		var caption=jQuery(this).find('.data-video').attr('data-caption');
		//jQuery('.video-light-box').find('.play-iframe-video').append('<video controls="controls"><source src="'+video_url+'" type="video/mp4"> <track src="'+caption+'"  srclang="en" label="English" kind="subtitles" default /></video>');
		jQuery('.video-light-box').fadeIn(300);
	});
	jQuery(".video-link.embed").click(function(event){
		event.preventDefault();
		jQuery(document).bind("mousewheel DOMMouseScroll",function(event){event.preventDefault()});
		jQuery(document).bind("touchmove",function(event){event.preventDefault()});
		jQuery('.video-light-box').fadeIn(300);
		var html = jQuery(this).find('.data-video').html();
		//console.log(html)
		//jQuery('.video-light-box').find('.play-iframe-video').html(html);
	});
	jQuery('.video-light-box .close').click(function(){
		jQuery(document).unbind("mousewheel DOMMouseScroll");
		jQuery(document).unbind("touchmove");
		jQuery('.video-light-box').fadeOut(300);
		// setTimeout(function(){
		// 		jQuery('.video-light-box').find('.play-iframe-video').html('');
		// },300);
	});
	jQuery('.video-light-box').click(function(){
		jQuery(document).unbind("mousewheel DOMMouseScroll");
		jQuery(document).unbind("touchmove");
		jQuery('.video-light-box').fadeOut(300);
		// setTimeout(function(){
		// 		jQuery('.video-light-box').find('.play-iframe-video').html('');
		// },300);
	});
	jQuery('.video-light-box .video-box').click(function(event){
		event.stopPropagation();
	});
}

function  bind($) {
	$(".close-btn").on("click",function(e){
		e.preventDefault();
		$(this).parents(".pop-up").removeClass("active");
	
	});
	$(".btn-form").on("click",function(e){
		e.preventDefault();

		var link = $(this).data('link');

		if(link){
			window.location.href = link;
		}else{
			$('.pop-up [name="email"]').val($('[name="email"]').val())
			$(".pop-up").addClass("active")
		}
		
		
	})
  }
