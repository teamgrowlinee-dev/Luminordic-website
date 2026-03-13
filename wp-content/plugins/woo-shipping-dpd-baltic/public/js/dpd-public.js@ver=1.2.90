(function( $, window, document ) {
	'use strict';

	$( document ).ready(function(){
		setTimeout(function() {

			var lang = $("html").attr("lang");
			if(lang == 'lt-LT') {
				var placeholder = 'Pasirinkite DPD Pickup tašką';
			}else {
				var placeholder = 'Choose a Pickup Point';
			}
			var search_value = $('.js--pudo-search').val();
			// alert(placeholder);
			$(".pickup-points-classic-select2").select2({
				dropdownAutoWidth : true,
				allowClear: true,
				minimumInputLength: 0,
				placeholder: placeholder,
				ajax: {
					url: '/wp-admin/admin-ajax.php',
					dataType: 'json',
					// delay: 100,
					data: function (params) {
						return {
							q: params.term, // search term
							search_value: search_value,
							// page: params.page,
							// action: 'get_data'
							action: 'search_pudo'
						};
					},
					processResults: function (data, params) {
						var options = []
						if( data.terminals ) {
							// data is the array of arrays with an ID and a label of the option
							$.each( data.terminals, function( index, text ) {
								options.push( { id: text['parcelshop_id'], text: text['company'] + ' ' + text['street']+ ' ' + text['city'] + ' ' + text['country'] + '-' + text['pcode'], cod: text['cod'], value:text['parcelshop_id'] } )
							})
						}
						return {
							results: options
						}
					},
					cache: false
				},
				// placeholder: 'Search for a pickup point',
				// minimumInputLength: 1,
				templateSelection: function(container) {
					$(container.element).attr("data-cod", container.cod);
					$(container.element).attr("data-value", container.value);
					return container.text;
				}

			});
		}, 1000);

	});

	function parcelChange() {
		let $wc_shipping_dpd_parcels_terminal = $( '#wc_shipping_dpd_parcels_terminal' );
		let cod                               = 0;

		cod = $wc_shipping_dpd_parcels_terminal.find( ':selected' ).data( 'cod' );

		$( document ).on(
			'change',
			'#wc_shipping_dpd_parcels_terminal',
			function(){

				let $this = $( this );
				cod       = $this.find( ':selected' ).data( 'cod' );

				set_session( cod );

			}
		);
	}

	function shipping_method_change() {

		$( document.body ).on(
			'click',
			'input[name="shipping_method[0]"]',
			function() {

				set_session( 1 );

				var selected_value = $(this).val();

				if (selected_value.indexOf("parcels") > 0) {
					setTimeout(function() {
						var lang = $("html").attr("lang");
						if(lang == 'lt-LT') {
							var placeholder = 'Pasirinkite DPD Pickup tašką';
						}else {
							var placeholder = 'Choose a Pickup Point';
						}
						var search_value = $('.js--pudo-search').val();
						$(".pickup-points-classic-select2").select2({
							dropdownAutoWidth : true,
							allowClear: true,
							minimumInputLength: 0,
							placeholder: placeholder,
							ajax: {
								url: '/wp-admin/admin-ajax.php',
								dataType: 'json',
								// delay: 100,
								data: function (params) {
									return {
										q: params.term, // search term
										search_value: search_value,
										// page: params.page,
										// action: 'get_data'
										action: 'search_pudo'
									};
								},
								processResults: function (data, params) {
									// console.log(data);
									// console.log(data.total_count);
									// parse the results into the format expected by Select2
									// since we are using custom formatting functions we do not need to
									// alter the remote JSON data, except to indicate that infinite
									// scrolling can be used
									// params.page = params.page || 1;
									//
									// return {
									//     results: data,
									//     pagination: {
									//         more: (params.page * 30) < data.total_count
									//     }
									// };
									var options = []
									if( data.terminals ) {
										// data is the array of arrays with an ID and a label of the option
										$.each( data.terminals, function( index, text ) {
											options.push( { id: text['parcelshop_id'], text: text['company'] + ' ' + text['street']+ ' ' + text['city'] + ' ' +text['country']+ '-' + text['pcode'], cod: text['cod'], value:text['parcelshop_id'] } )
										})
									}
									return {
										results: options
									}
								},
								cache: false
							},
							// placeholder: 'Search for a pickup point',
							// minimumInputLength: 1,
							templateSelection: function(container) {
								$(container.element).attr("data-cod", container.cod);
								$(container.element).attr("data-value", container.value);
								return container.text;
							}

						});
					}, 1000);
				}

			}
		);

	}

	function payment_method_change() {

		$( document.body ).on(
			'change',
			"[name='payment_method']",
			function() {
				$( document.body ).trigger( "update_checkout" );
			}
		);

	}

	function country_change() {

		$( document.body ).on(
			'change',
			"[name='billing_country']",
			function(e) {
				setTimeout(function() {
					var lang = $("html").attr("lang");
					if(lang == 'lt-LT') {
						var placeholder = 'Pasirinkite DPD Pickup tašką';
					}else {
						var placeholder = 'Choose a Pickup Point';
					}
					$(".pickup-points-classic-select2").select2({
						dropdownAutoWidth : true,
						allowClear: true,
						minimumInputLength: 0,
						placeholder: placeholder,
						ajax: {
							url: '/wp-admin/admin-ajax.php',
							dataType: 'json',
							// delay: 100,
							data: function (params) {
								return {
									q: params.term, // search term
									// page: params.page,
									// action: 'get_data'
									action: 'search_pudo'
								};
							},
							processResults: function (data, params) {
								// console.log(data);
								// console.log(data.total_count);
								// parse the results into the format expected by Select2
								// since we are using custom formatting functions we do not need to
								// alter the remote JSON data, except to indicate that infinite
								// scrolling can be used
								// params.page = params.page || 1;
								//
								// return {
								//     results: data,
								//     pagination: {
								//         more: (params.page * 30) < data.total_count
								//     }
								// };
								var options = []
								if( data.terminals ) {
									// data is the array of arrays with an ID and a label of the option
									$.each( data.terminals, function( index, text ) {
										options.push( { id: text['parcelshop_id'], text: text['company'] + ' ' + text['street']+ ' ' + text['city'] + ' ' +text['country']+ '-' + text['pcode'], cod: text['cod'], value:text['parcelshop_id'] } )
									})
								}
								return {
									results: options
								}
							},
							cache: false
						},
						// placeholder: 'Search for a pickup point',
						// minimumInputLength: 1,
						templateSelection: function(container) {
							$(container.element).attr("data-cod", container.cod);
							$(container.element).attr("data-value", container.value);
							return container.text;
						}

					});
				}, 1500);
			}
		);

	}

	function set_session( cod ) {
		let data = {
			'action': 'set_checkout_session',
			'cod': cod,
			'fe_ajax_nonce': dpd.fe_ajax_nonce
		};

		let obj = null;

		if (typeof wc_checkout_params !== 'undefined') {
			obj = wc_checkout_params;
		} else if (typeof wc_cart_params !== 'undefined') {
			obj = wc_cart_params;
		}

		if (obj !== null) {
			$.post(
				obj.ajax_url,
				data,
				function() {
					setTimeout(
						function () {
							$( document.body ).trigger( "update_checkout" );
						},
						300
					);
				}
			);
		}
	}

	function timeShiftChange(){
		$( document.body ).on(
			'change',
			"[name='wc_shipping_dpd_home_delivery_shifts']",
			function() {
				var delivery_shifts = $(this).val();

				if ($("body").hasClass('theme-Divi')) {
					$.ajax({
						url: '/wp-admin/admin-ajax.php',
						type: 'POST',
						data: {
							action: 'set_delivery_shifts',
							delivery_shifts: delivery_shifts,
						},
						dataType: 'json',
						success: function(response) {
						},
						error: function(error) {
							console.error('AJAX Error:', error);
						}
					});
				}
				$( document.body ).trigger( "update_checkout" );
			}
		);
	}

	function setInputValue(input, value) {
		input.value = value; // Nustatome reikšmę
		input.focus(); // Fokusavimas, jei reikia
		setTimeout(() => {
			input.setSelectionRange(value.length, value.length); // Perkeliame žymeklį į pabaigą
		}, 0); // Leidžiame DOM atnaujinti reikšmę
	}

	function debounce(func, delay) {
		let timer;
		return function (...args) {
			clearTimeout(timer);
			timer = setTimeout(() => func.apply(this, args), delay);
		};
	}

	function setInputValueSafely(input, value) {
		let currentValue = input.value;
		let selectionStart = input.selectionStart; // Išsaugome žymeklio vietą

		if (currentValue !== value) { // Tik jei reikšmė skiriasi
			input.value = value;

			// Naudojame `requestAnimationFrame`, kad užtikrintume žymeklio perkėlimą po DOM atnaujinimo
			requestAnimationFrame(() => {
				input.setSelectionRange(value.length, value.length); // Perkeliame žymeklį į pabaigą
			});
		}
	}

	function pudoSelection() {
		const parcelsTerminalElement = $('#wc_shipping_dpd_parcels_terminal');
		const selectedValueDefault = parcelsTerminalElement.val();
		const selectedTextDefault = parcelsTerminalElement.text();
		const selectedCOD = parcelsTerminalElement.attr('data-cod');

		if (selectedValueDefault !== '') {
			$('.custom-dropdown .selected-option').text(selectedValueDefault);

			if (selectedCOD != undefined) {
				$('.custom-dropdown .selected-option').attr('data-cod', selectedCOD);
				set_session( selectedCOD );
			}
		}

		$(document).on('click', function (event) {
			if (!$(event.target).closest('.custom-dropdown').length) {
				$('.custom-dropdown .dropdown-list').removeClass('active');
			}
		});

		$( document.body ).on('click', '.custom-dropdown .dropdown-list .pudo', function () {

			var selectedValue = $(this).attr('data-value');

			if ($("body").hasClass('theme-Divi')) {
				$.ajax({
					url: '/wp-admin/admin-ajax.php',
					type: 'POST',
					data: {
						action: 'set_terminal_value',
						selected_value: selectedValue,
					},
					dataType: 'json',
					success: function(response) {
					},
					error: function(error) {
						console.error('AJAX Error:', error);
					}
				});
			}


			var dataCOD = $(this).attr('data-cod');
			var selectedText = $(this).text();

			$(this).closest('.custom-dropdown').find('.selected-option').text(selectedText);
			$(this).closest('.custom-dropdown').find('input').val(selectedValue);

			$('#wc_shipping_dpd_parcels_terminal').val(selectedValue);
			$('.custom-dropdown .selected-option').attr('data-cod', dataCOD);

			$(this).closest('.dropdown-list').removeClass('active');
		});

		var keyTimer = null;

		let currentRequest = null;

		$(document).on('input', '.custom-dropdown .js--pudo-search', debounce(function () {
			var search_value = $(this).val().trim();  // Get the input value
			// var search_value = $(this).val();

			// // If there's an ongoing AJAX request, cancel it
			if (currentRequest) {
				currentRequest.abort();
			}

			// Only trigger AJAX if there's input (optional)
			currentRequest = $.ajax({
				url: '/wp-admin/admin-ajax.php',
				type: 'POST',
				data: {
					action: 'search_pudo',
					search_value: search_value,
				},
				dataType: 'json',
				success: function(response) {
					// Handle the response and update the dropdown
					$('.custom-dropdown .dropdown-list .dropdown-list-search-list').empty().append(response.terminals);

					// $('.custom-dropdown .js--pudo-search').val(search_value);

					// Focus the input and move the cursor to the end of the value
					// var inputField = $('.custom-dropdown .js--pudo-search')[0];
					// inputField.focus();
					// inputField.setSelectionRange(inputField.value.length, inputField.value.length); // Move cursor to the end
					// var inputField = $('.custom-dropdown .js--pudo-search')[0];
					// inputField.focus();
					// inputField.setSelectionRange(inputField.value.length, inputField.value.length);
				},
				error: function(error) {
					console.error('AJAX Error:', error);
				}
			});
		}, 100));

		// keyup change paste keyup
		// $( document).on('input', '.custom-dropdown .js--pudo-search', function () {
		// 	if (keyTimer) { // Cancel a previous timer
		// 		clearTimeout(keyTimer);
		// 	}
		// 	let search_value = $(this).val();
		//
		// 	keyTimer = setTimeout(function() { // Start a new timer
		// 		keyTimer = null;
		// 		// AJAX call...
		// 		$.ajax({
		// 			url: '/wp-admin/admin-ajax.php',
		// 			type: 'POST',
		// 			data: {
		// 				action: 'search_pudo',
		// 				search_value: search_value,
		// 			},
		// 			dataType: 'json',
		// 			success: function(response) {
		// 				$('.custom-dropdown .dropdown-list').empty();
		// 				$('.custom-dropdown .dropdown-list').append(response.terminals);
		//
		//
		// 				// let input = document.querySelector('.custom-dropdown .js--pudo-search');
		// 				// setInputValue(input, search_value); // Nustatome reikšmę be klaidų
		// 				// $('.custom-dropdown .js--pudo-search').val('').val(search_value).focus();
		// 				// $('.custom-dropdown .js--pudo-search').focus().val('').val(search_value);
		// 				// $('.custom-dropdown .js--pudo-search').focus().val('').val(search_value);
		// 			},
		// 			error: function(error) {
		// 				console.error('AJAX Error:', error);
		// 			}
		// 		});
		// 	}, 400); // Wait at least 200ms
		//
		//
		// });

		// $( document.body ).on('change', '.custom-dropdown .pickup-points-classic-select2', function () {
		// 	var selectedValue = $(".pickup-points-classic-select2 option:selected").attr('data-value');
		//
		// 	var dataCOD = $(".pickup-points-classic-select2 option:selected").attr('data-cod');
		// 	var selectedText = $(".pickup-points-classic-select2 option:selected").text();
		//
		// 	$(this).closest('.custom-dropdown').find('.selected-option').text(selectedText);
		// 	$(this).closest('.custom-dropdown').find('input').val(selectedValue);
		//
		// 	$('#wc_shipping_dpd_parcels_terminal').val(selectedValue);
		// 	$('.custom-dropdown .selected-option').attr('data-cod', dataCOD);
		//
		// 	$(this).closest('.dropdown-list').removeClass('active');
		// 	$(this).closest('.dropdown-list').toggle();
		//
		// 	// var selectedValue = $(this).attr('data-value');
		// 	//
		// 	// var dataCOD = $(this).attr('data-cod');
		// 	// var selectedText = $(this).text();
		// 	//
		// 	// $(this).closest('.custom-dropdown').find('.selected-option').text(selectedText);
		// 	// $(this).closest('.custom-dropdown').find('input').val(selectedValue);
		// 	//
		// 	// $('#wc_shipping_dpd_parcels_terminal').val(selectedValue);
		// 	// $('.custom-dropdown .selected-option').attr('data-cod', dataCOD);
		// 	//
		// 	// $(this).closest('.dropdown-list').removeClass('active');
		// });

		$( document.body ).on('click', '.custom-dropdown .selected-option', function () {
			$(this).siblings('.dropdown-list').toggleClass('active');
		});

		// $( document.body ).on('click', '.custom-dropdown .selected-option', function () {
		// 	// alert('test');
		// 	$('.select2-div').toggle();
		// 	$(".pickup-points-classic-select2").select2({
		// 		dropdownAutoWidth : true,
		// 		allowClear: true,
		// 		minimumInputLength: 0,
		// 		ajax: {
		// 			url: '/wp-admin/admin-ajax.php',
		// 			dataType: 'json',
		// 			// delay: 100,
		// 			data: function (params) {
		// 				return {
		// 					q: params.term, // search term
		// 					// page: params.page,
		// 					action: 'get_data'
		// 				};
		// 			},
		// 			processResults: function (data, params) {
		// 				// console.log(data);
		// 				// console.log(data.total_count);
		// 				// parse the results into the format expected by Select2
		// 				// since we are using custom formatting functions we do not need to
		// 				// alter the remote JSON data, except to indicate that infinite
		// 				// scrolling can be used
		// 				// params.page = params.page || 1;
		// 				//
		// 				// return {
		// 				//     results: data,
		// 				//     pagination: {
		// 				//         more: (params.page * 30) < data.total_count
		// 				//     }
		// 				// };
		// 				var options = []
		// 				if( data ) {
		// 					// data is the array of arrays with an ID and a label of the option
		// 					$.each( data, function( index, text ) {
		// 						options.push( { id: text['parcelshop_id'], text: text['company'] + ' ' + text['street']+ ' ' + text['city'], cod: text['cod'], value:text['parcelshop_id'] } )
		// 					})
		// 				}
		// 				return {
		// 					results: options
		// 				}
		// 			},
		// 			cache: false
		// 		},
		// 		// placeholder: 'Search for a pickup point',
		// 		// minimumInputLength: 1,
		// 		templateSelection: function(container) {
		// 			$(container.element).attr("data-cod", container.cod);
		// 			$(container.element).attr("data-value", container.value);
		// 			return container.text;
		// 		}
		//
		// 	});
		// 	// $(this).siblings('.dropdown-list').toggleClass('active');
		// });
	}

	function loadMore() {
		$( document.body ).on(
			'click',
			'#load-more-btn',
			function() {
				loadMoreItems();
			}
		);
	}

	function loadMoreItems() {
		let obj = null;
		let loadMoreButton = $('#load-more-btn');

		if (typeof wc_checkout_params !== 'undefined') {
			obj = wc_checkout_params;
		} else if (typeof wc_cart_params !== 'undefined') {
			obj = wc_cart_params;
		}

		$('.load-more').text('Loading...');
		let page = parseInt(loadMoreButton.attr('load-more-page') || 1);
		page = page + 1;

		$.ajax({
			url: obj.ajax_url,
			type: 'POST',
			data: {
				action: 'load_more_items',
				page: page,
			},
			success: function(response) {
				$('.load-more').text('Load More');

				if (response.success) {
					appendItems(response.data.listPudos);
					loadMoreButton.attr('load-more-page', page);

					if (!response.data.hasMore) {
						loadMoreButton.addClass('hidden');
					}
				} else {
					console.error('Error:', response.data);
				}
			},
			error: function(error) {
				$('.load-more').text('Load More');
				console.error('AJAX Error:', error);
			}
		});
	}

	function getGroupedTerminals(terminals) {
		var groupedTerminals = {};
		var groupedTerminalResponse = [];

		terminals.forEach(function (terminal) {
			if (!groupedTerminals[terminal.city] && terminal.status === '1') {
				groupedTerminals[terminal.city] = [];
			}

			if (terminal.status === '1') {
				groupedTerminals[terminal.city].push(terminal);
			}
		});


		Object.keys(groupedTerminals).sort().forEach(function (group) {
			let object = {
				'city': group,
				'items': groupedTerminals[group]
			}

			groupedTerminalResponse.push(object);
		});

		return groupedTerminalResponse;
	}

	function getFormattedTerminalName(terminal) {
		return terminal.name;
	}

	function appendItems(items) {
		let groupedTerminals = getGroupedTerminals(items);
		let groupPudo = '';

		groupedTerminals.forEach(function(terminal) {
			groupPudo = groupPudo + appendPudoGroup(terminal);
		});

		$('.custom-dropdown .dropdown-list li:last').after(groupPudo);
	}

	function appendPudoGroup(groupPudoData) {
		let groupPudo = '<li class="group-pudo">' + groupPudoData.city + '</li>';

		groupPudoData.items.forEach(function(pudo) {
			let child = '<li class="pudo" data-cod="" data-value="' + pudo.parcelshop_id + '">' + pudo.company + '</li>';

			groupPudo = groupPudo + child;
		});

		return groupPudo;
	}

	$(
		function() {
			parcelChange();
			shipping_method_change();
			// payment_method_change();
			timeShiftChange();
			pudoSelection();
			loadMore();
			country_change();
		}
	);

})( window.jQuery, window, document );