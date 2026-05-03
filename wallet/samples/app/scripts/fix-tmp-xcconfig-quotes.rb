#!/usr/bin/env ruby
# frozen_string_literal: true

# Xcode .xcconfig values with spaces must be quoted or the key is truncated.
# react-native-config BuildXCConfig.rb writes unquoted values; fix lines that need it.
path = ARGV[0]
exit 0 if path.nil? || path.empty? || !File.exist?(path)

out =
  File
    .readlines(path, chomp: true)
    .map do |line|
      next line if line.strip.empty? || line.strip.start_with?('#')
      next line unless line =~ /^([A-Za-z0-9_]+)=(.*)$/

      k = Regexp.last_match(1)
      v = Regexp.last_match(2)
      next line if v.start_with?('"')
      next line unless v.match?(/\s/)

      %(#{k}="#{v.gsub('"', '\\"')}")
    end
    .join("\n")

File.write(path, "#{out}\n")
