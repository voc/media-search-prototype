#!/usr/bin/env perl

use v5.12;
use strict;
use warnings;

use local::lib ("$ENV{HOME}/.perl5");

use LWP::Simple;
use Search::Elasticsearch;
use JSON::XS;
use Data::Dumper;

use constant {
	WEBGEN_PREFIX => "http://media.ccc.de/browse/",
};

my $raw;

if($ARGV[0]) {
	use File::Slurp;

	$raw = read_file($ARGV[0]) or die "read failed: $@";
} else {
	$raw = get("http://api.media.ccc.de/public/events") or die "GET failed: $@";
}

my $events = decode_json($raw) or die "JSON decode failed: $@";

my $es = Search::Elasticsearch->new() or die "Connecting to elasticsearch failed: $@";

my $cache = {};
sub get_cached {
	my ($url) = @_;

	if(exists $cache->{$url}) {
		return $cache->{$url}
	}

	my $data = get($url) or die "GET failed: $@";
	my $json = decode_json($data) or die "JSON decode failed: $@";

	$cache->{$url} = $json;

	return $json;
}

foreach my $event (@{$events->{events}}) {
	my $conference = get_cached($event->{conference_url});

	my $dbevent;
	foreach my $key (qw(tags frontend_link guid thumb_url release_date date description poster_url link title url length persons subtitle updated_at)) {
		if(exists $event->{$key}) {
			$dbevent->{$key} = $event->{$key};
		}
	}

	$es->index(
		index => 'media',
		type => 'event',
		id => $event->{guid},
		body => {
			event => $dbevent,
			conference => {
				title => $conference->{title},
				acronym => $conference->{acronym},

				frontend_link => WEBGEN_PREFIX . $conference->{webgen_location},
				url => $event->{conference_url}
			}
		}
	) or die "insert failed: $@";
}
