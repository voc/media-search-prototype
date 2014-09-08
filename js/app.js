$(function() {
	var
		$search = $('.search'),
		$results = $('.results'),
		$template = $results.find('> ol > li.template').detach(),
		baseUrl = window.location.protocol+'//'+window.location.host+window.location.pathname;

	$search
		.find('input.text')
		.focus()
	.end()
	.on('click', 'input.submit', function(e, triggerOrigin) {
		e.preventDefault();
		var
			$submit = $(this),
			$form = $submit.closest('form'),
			$input = $form.find('input.text');

		$.ajax({
			dataType: $.support.cors ? 'json' : 'jsonp',
			url: 'http://178.62.143.243:9200/media/_search/',
			type: 'post',
			data: JSON.stringify({
				'query': {
					'term': {
						'_all': $input.val().toLowerCase()
					}
				}
			}),
			success: function(res) {
				$results.find('> ol > li').remove();

				jQuery.each(res.hits.hits, function(idx, hit) {
					var $item = $template
						.clone()
						.appendTo($results)
						.removeClass('template')
						.find('.conference-link')
							.text('tbd.;')
							.attr('href', 'http://media.ccc.de/browse/conferences/tbd.;')
						.end()
						.find('.conference-search')
							.text('tbd.;')
							.attr('href', baseUrl+'?q='+encodeURIComponent('tbd.;'))
						.end()
						.find('.event-link')
							.text(hit._source.title)
							.attr('href', hit._source.frontend_link)
						.end()
						.find('.event-search')
							.text(hit._source.title)
							.attr('href', baseUrl+'?q='+encodeURIComponent(hit._source.title))
						.end();

					var
						$persons = $item.find('ul.persons'),
						$personTemplate = $persons.find('li.template').detach();

					jQuery.each(hit._source.persons, function(idx, person) {
						$personTemplate
							.clone()
							.removeClass('template')
							.find('.person-link')
								.text(person)
								.attr('href', baseUrl+'?q=person:'+encodeURIComponent(person))
							.end()
							.appendTo($persons);
					});
				});

				if(triggerOrigin == 'param') {
					$results.removeClass('initial');
				}

				else if($form.hasClass('initial'))
				{
					$form.add($results).css({opacity: 0}).removeClass('initial').animate({
						opacity: 1
					}, {
						opacity: 0
					})
				}
			}
		});

		if(triggerOrigin == 'param') {
			$form.removeClass('initial');
		}
		else if($form.hasClass('initial'))
		{
			$form.animate({
				opacity: 0
			}, {
				duration: 0.75
			})
		}
	});

	var param = $.url().param();
	if(param.q) {
		$search
			.find('input.text')
			.val(param.q)
		.end()
			.find('input.submit')
			.trigger('click', 'param');
	}
});
