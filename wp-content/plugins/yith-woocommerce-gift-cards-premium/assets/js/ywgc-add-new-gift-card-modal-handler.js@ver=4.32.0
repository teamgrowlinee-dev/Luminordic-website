/**
 * Handle the "Add new" gift card on my account
 *
 */
(function ($) {

	if (typeof ywgc_add_new_gift_card_data === "undefined") {
		return;
	}

	function animateInElem( elem, animation, callback ) {
		elem.show().addClass( 'animated ' + animation );
		elem.one( 'animationend', function() {
			elem.removeClass( 'animated ' + animation );
			if( typeof callback != 'undefined' ) {
				callback();
			}
		});
	}

	var YITHAddNewGiftCardModal = function( item ) {
		if( ! item.length ) {
			return;
		}

		this.self               = item;
		this.wrap               = item.find( '.yith-ywgc-add-new-gift-card-modal-wrapper' );
		this.popup              = item.find( '.yith-ywgc-add-new-gift-card-modal' );
		this.content            = item.find( '.yith-ywgc-add-new-gift-card-modal-content-wrapper' );
		this.overlay            = item.find( '.yith-ywgc-add-new-gift-card-modal-overlay' );
		this.blocked            = false;
		this.opened             = false;
		this.additional         = false;
		this.animationIn        = this.popup.attr( 'data-animation-in' );

		// position first
		this.position( null );

		// prevent propagation on popup click
		$( this.popup ).on( 'click', function(ev){
			ev.stopPropagation();
		})

		// attach event
		$( window ).on( 'resize', { obj: this }, this.position );
		// open
		$( document ).on( 'click', '#ywgc-add-new-gift-card', { obj: this, additional: false }, this.open );

		//close the popup on overlay click
		$(document).on( 'click', '.yith-ywgc-add-new-gift-card-modal-overlay.close-on-click', function (e) {
			e.preventDefault();
			$('.yith-ywgc-add-new-gift-card-modal-wrapper .yith-ywgc-add-new-gift-card-modal-close').click();
		});

		//close the popup on X button click
		this.popup.on( 'click', '.yith-ywgc-add-new-gift-card-modal-close', { obj: this }, this.close);
	};

	/** UTILS **/
	YITHAddNewGiftCardModal.prototype.position           = function( event ) {
		let popup    = event == null ? this.popup : event.data.obj.popup,
			window_w = $(window).width(),
			window_h = $(window).height(),
			margin   = ( ( window_w - 40 ) > ywgc_add_new_gift_card_data.popupWidth ) ? window_h/10 + 'px' : '0',
			width    = ( ( window_w - 40 ) > ywgc_add_new_gift_card_data.popupWidth ) ? ywgc_add_new_gift_card_data.popupWidth + 'px' : 'auto';

		popup.css({
			'margin-top'    : margin,
			'margin-bottom' : margin,
			'width'         : width,
		});
	};

	YITHAddNewGiftCardModal.prototype.block              = function() {
			if( ! this.blocked ) {
				this.popup.block({
					message   : null,
					overlayCSS: {
						background: '#fff url(' + ywgc_add_new_gift_card_data.loader + ') no-repeat center',
						opacity   : 0.5,
						cursor    : 'none'
					}
				});
				this.blocked = true;
			}
	};

	YITHAddNewGiftCardModal.prototype.unblock            = function() {
		if( this.blocked ) {
			this.popup.unblock();
			this.blocked = false;
		}
	};


	/** EVENT **/
	YITHAddNewGiftCardModal.prototype.open               = function( event ) {
		event.preventDefault();

		let object = event.data.obj;
		// if already opened, return
		if( object.opened ) {
			return;
		}

		object.opened = true;

		// add template
		object.loadTemplate( 'add-new-gift-card-template', {
			title: ''
		} );
		// animate
		object.self.fadeIn("slow");
		animateInElem( object.overlay, 'fadeIn' );
		animateInElem( object.popup, object.animationIn );
		// add html and body class
		$('html, body').addClass( 'yith-ywgc-add-new-gift-card-modal-opened' );

		object.wrap.css('position', 'fixed');
		object.overlay.css('position', 'fixed');
		object.overlay.css('z-index', '1');
		object.wrap.find('#ywgc-link-code').focus();

		// trigger event
		$(document).trigger( 'yith_ywgc_add_new_gift_card_modal_opened', [ object.popup, object ] );

		// Ajax to add the new gift card

		$( '.ywgc-link-gift-card-submit-button' ).on('click', function() {

			var ajax_zone = $( '.ywgc-add-new-gift-card-form' );
			var gift_card_code  = $( '#ywgc-link-code' ).val(),
				user_id  = $( this ).data( 'current-user-id' );
			var data = {
				gift_card_code: gift_card_code,
				user_id: user_id,
				action: 'ywgc_add_new_gift_card_my_account'
			};

			ajax_zone.block( { message: null, overlayCSS: { background: "#f1f1f1", opacity: .5 } } );

			$.ajax({
				type: 'POST',
				url: ywgc_add_new_gift_card_data.ajax_url,
				data: data,
				dataType: 'json',
				success: function(response) {
					if ( response.success ) {
						$( '.yith-add-new-gc-my-account-notice-message.not_valid' ).hide();
						$( '.yith-add-new-gc-my-account-notice-message.valid' ).show();

						setTimeout(
							function() {
								$('.yith-ywgc-add-new-gift-card-modal-wrapper .yith-ywgc-add-new-gift-card-modal-close').click();
								location.reload();
							}, 3000);
					} else {
						$( '.yith-add-new-gc-my-account-notice-message.not_valid' ).show();
					}

					ajax_zone.unblock();
				},
				error: function(response) {
					ajax_zone.unblock();
					return false;
				}
			});
		});



	};

	YITHAddNewGiftCardModal.prototype.loadTemplate       = function( id, data ) {
		var template            = wp.template( id );
		this.showTemplate( template( data ) );
	};

	YITHAddNewGiftCardModal.prototype.showTemplate       = function( section ) {
		this.content.hide().html( section ).fadeIn("slow");
		$(document).trigger( 'yith_ywgc_add_new_gift_card_modal_template_loaded', [ this.popup, this ] );
	};

	YITHAddNewGiftCardModal.prototype.close              = function( event ) {
		event.preventDefault();

		var object = event.data.obj;

		object.additional    = false;
		object.opened        = false;
		object.self.fadeOut("slow");

		// remove body class
		$('html, body').removeClass( 'yith-ywgc-add-new-gift-card-modal-opened' );
		// trigger event
		$(document).trigger( 'yith_ywgc_add_new_gift_card_modal_template_closed', [ object.popup, object ] );

	};

	// START
	$( function(){
		new YITHAddNewGiftCardModal( $( document ).find( '#yith-ywgc-add-new-gift-card-modal-container' ) );
	});

})( jQuery );
