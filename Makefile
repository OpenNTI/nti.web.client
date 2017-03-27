.PHONY: build clean check test

LIB = lib
REPORTS = reports

all: test build

node_modules: package.json
	@rm -rf node_modules
	@npm install
#	@npm update
#	@touch $@

check:
	@eslint --ext .js,.jsx ./src

test: node_modules check
	@jest

clean:
	@rm -rf $(LIB)
	@rm -rf $(REPORTS)

build:
	@rollup -c
