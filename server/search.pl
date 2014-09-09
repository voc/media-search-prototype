#!/usr/bin/env perl

use v5.12;
use strict;
use warnings;

use local::lib ("$ENV{HOME}/.perl5");

use Mojolicious::Lite;
use Search::Elasticsearch;
use Data::Dumper;

my $e = Search::Elasticsearch->new();

sub dosearch {
	my $query = shift;

	my $ret = $e->search(
		index => 'media',
		type => 'event',
		body => {
			query => $query,
		}
	);
}

get '/:string' => sub {
	my $c = shift;
	my $str = $c->param('string');

	my $ret = dosearch({
			bool => {
				should => [
					{match => { 'event.title' => { query => $str, fuzziness => "AUTO"}}},
					{match => { 'event.description' => {query => $str, fuzziness => "AUTO"}}},
					{match => { 'event.persons' => {query => $str, fuzziness => "AUTO"}}},
					{match => { 'conference.title' => {query => $str, fuzziness => "AUTO"}}},
					{match => { 'conference.acronym' => {query => $str, fuzziness => "AUTO"}}},
				]
			}
		});


	$c->render(json => $ret);
};

get '/persons/:string' => sub {
	my $c = shift;
	my $str = $c->param('string');

	my $ret = dosearch({
			match => { 'event.persons' => {query => $str, fuzziness => 'AUTO'}}
		});


	$c->render(json => $ret);
};

app->start;
