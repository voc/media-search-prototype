$(function() {
	var
		$search = $('.search'),
		$results = $('.results'),
		$statistics = $results.find('.statistics'),
		$paging = $results.find('.paging'),
		$pagingPostfix = $paging.find('.postfix'),
		$pagingTemplate = $paging.find('.template').detach(),
		$template = $results.find('> ol > li.template').detach(),
		$noresults = $results.find('> ol > li.no-results').detach(),
		baseUrl = window.location.protocol+'//'+window.location.host+window.location.pathname,
		baseTitleTpl = $('title').data('titletpl'),
		pageNr = 0,
		perPage = 15;

	$search
		.find('input.text')
		.focus()
	.end()
	.on('click', 'input.submit', function(e, triggerOrigin) {
		e.preventDefault();
		var
			$submit = $(this),
			$form = $submit.closest('form'),
			$input = $form.find('input.text'),
			term = $input.val(),
			lterm = term.toLowerCase(),
			title = baseTitleTpl.replace('#', $input.val());

		document.title = title;
		if(window.history && window.history.pushState)
			window.history.pushState({}, title, '?q='+encodeURIComponent(term));

		$input.blur();
		$.ajax({
			dataType: $.support.cors ? 'json' : 'jsonp',
			url: 'http://178.62.143.243:9200/media/event/_search/',
			type: 'post',
			data: JSON.stringify({
				query: {
					function_score: {
						query: {
							bool: {
								disable_coord: true,
								should: [
									{
										multi_match: {
											query: lterm,
											fields: [
												'event.title^4',
												'event.subtitle^3',
												'event.persons^3',
												'conference.acronym^2',
												'conference.title^2',
												'event.description^1'
											],
											type: 'best_fields',
											operator: 'or',
											fuzziness: 1
										},
									},
									{
										prefix: {
											'event.title': {
												value: lterm,
												boost: 12
											}
										}
									},
									{
										prefix: {
											'event.subtitle': {
												value: lterm,
												boost: 3
											}
										}
									},
									{
										prefix: {
											'conference.acronym': {
												value: lterm,
												boost: 2
											}
										}
									},
									{
										prefix: {
											'conference.persons': {
												value: lterm,
												boost: 1
											}
										}
									}
								]
							}
						},
						boost: 1.2,
						functions: [
							{
								"gauss": {
									"event.date": {
										"scale": "96w",
										"decay": 0.5
									}
								}
							}
						]
					}
				},
				from: pageNr*perPage,
				size: perPage
			}),
			success: function(res) {
				var
					conferenceSearchBase = $template.find('.conference-search').data('titletpl'),
					eventSearchBase = $template.find('.event-search').data('titletpl'),
					$list = $results
						.find('> ol')
						.find('> li')
							.remove()
						.end();

				$statistics
					.find('.visible')
						.text(res.hits.hits.length)
					.end()
					.find('.total')
						.text(res.hits.total)
					.end()
					.find('.runtime')
						.text(res.took);

				$paging.toggleClass('visible', res.hits.total > res.hits.hits.length);
				if(res.hits.total > res.hits.hits.length) {
					$paging.find('li.page').remove();
					var npages = Math.floor(10, Math.ceil(res.hits.total / perPage));
					for (var i = 0; i < npages; i++) {
						$pagingTemplate
							.clone()
							.removeClass('template')
							.find('a')
								.attr('href', '?p='+i+'&q='+encodeURIComponent(term))
							.end()
							.find('.number')
								.text(i+1)
							.end()
							.insertBefore($pagingPostfix);
					}
				}

				if(res.hits.hits.length == 0) {
					$noresults.appendTo($list);
				}
				else {
					jQuery.each(res.hits.hits, function(idx, hit) {
						var quality = hit._score * 100 / res.hits.max_score;
						var $item = $template
							.clone()
							.appendTo($list)
							.attr('data-quality', quality) // .data() does not show up in the DOM
							.addClass(
								quality > 80 ? 'high' :
								quality > 50 ? 'medium' :
								quality > 30 ? 'low' :
								'nonsense'
							)
							.removeClass('template')
							.find('.conference-link')
								.text(hit._source.conference.acronym)
								.attr('title', hit._source.conference.title)
								.attr('href', hit._source.conference.frontend_link)
							.end()
							.find('.conference-search')
								.text(hit._source.conference.acronym)
								.attr('title', conferenceSearchBase.replace('%', hit._source.conference.title))
								.attr('href', baseUrl+'?q='+encodeURIComponent(hit._source.conference.title))
							.end()
							.find('.event-link')
								.text(hit._source.event.title)
								.attr('href', hit._source.event.frontend_link)
							.end()
							.find('.event-search')
								.text(hit._source.event.title)
								.attr('title', eventSearchBase.replace('%', hit._source.event.title))
								.attr('href', baseUrl+'?q='+encodeURIComponent(hit._source.event.title))
							.end();

						var
							$persons = $item.find('ul.persons'),
							$personTemplate = $persons.find('li.template').detach();

						jQuery.each(hit._source.event.persons, function(idx, person) {
							$personTemplate
								.clone()
								.removeClass('template')
								.find('.person-link')
									.text(person)
									.attr('href', baseUrl+'?q='+encodeURIComponent(person))
								.end()
								.appendTo($persons);
						});
					});
				}

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
