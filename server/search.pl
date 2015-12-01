#!/usr/bin/env perl

use v5.12;
use strict;
use warnings;

use local::lib;

use Mojolicious::Lite;
use Search::Elasticsearch;
use Data::Dumper;

plugin JSONP => callback => 'callback';

my $e = Search::Elasticsearch->new();

sub dosearch {
	my $ret = $e->search(
		index => 'media',
		type => 'event',
		body => {
			@_
		}
	);
}

sub term_search {
	my $c = shift;
	my $str = lc($c->param('term') // "");
	my $page = $c->param('displayPage') // 0;
	my $per_page = $c->param('perPage') // 10;

	my $ret = dosearch(
			query => {
				function_score => {
					query => {
						bool => {
							disable_coord => 1,
							should => [
								{
									multi_match => {
										query => $str,
										fields => [
											'event.title^4',
											'event.subtitle^3',
											'event.persons^3',
											'conference.acronym^2',
											'conference.title^2',
											'event.description^1'
										],
										type => 'best_fields',
										operator => 'and',
										fuzziness => 1
									},
								},
								{
									prefix => {
										'event.title' => {
											value => $str,
											boost => 12
										}
									}
								},
								{
									prefix => {
										'event.subtitle' => {
											value => $str,
											boost => 3
										}
									}
								},
								{
									prefix => {
										'conference.acronym' => {
											value => $str,
											boost => 2
										}
									}
								},
								{
									prefix => {
										'conference.persons' => {
											value => $str,
											boost => 1
										}
									}
								}
							]
						}
					},
					boost => 1.2,
					functions => [
						{
							"gauss" => {
								"event.date" => {
									"scale" => "96w",
									"decay" => 0.5
								}
							}
						}
					]
				}
			},
			from => $page * $per_page,
			size => $per_page
	);

	$c->render_jsonp($ret);
};

post '/term' => \&term_search;
get '/term' => \&term_search;

app->hook(before_dispatch => sub {
		my $c = shift;
		$c->req->url->base(Mojo::URL->new(q{http://koeln.media.ccc.de/search/api/}));

		# remove the "/search/api"-prefix
		shift @{$c->req->url->path};
		shift @{$c->req->url->path};

		$c->res->headers->header( 'Access-Control-Allow-Origin' => '*' );
		$c->res->headers->header( 'Access-Control-Allow-Methods' => 'GET, POST, OPTIONS' );
		$c->res->headers->header( 'Access-Control-Max-Age' => '3600' );
	});

app->types->type(json => "application/json; charset=utf-8");
app->types->type(html => "text/html; charset=utf-8");

app->start;
