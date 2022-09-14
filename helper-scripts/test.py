
import requests, json, re
from bs4 import BeautifulSoup

def main():
	print ("\tParsing Google Doc for end of recap times")
	recaps = []
	page = requests.get("https://docs.google.com/spreadsheets/d/e/2PACX-1vTjsFgiQ9QooJSy2o31hQcTLQhrydFfJFBOZIUlMtyU1dI07IHWXCl2sUMgwwhF0K5BiBjg-GEcARez/pubhtml")
	soup = BeautifulSoup(page.content, "html.parser")

	tbody = soup.find("tbody")
	rows = tbody.find_all("tr")

	for row in rows:
		if len(row.contents) == 6:
			if row.contents[1].string.isnumeric():
				if re.compile("\d*:\d*:\d*").match(row.contents[2].string):
					start = 0
					end = parseTime(row.contents[2].string) - 1
					th = Theme(row.contents[0].string, row.contents[0].string, end - start, start)
					recaps.append(th)
				return

	print ("\t\tFinished")
	
def parseTime(string):
	ret = 0
	s = string.split(":")
	if len(s) == 3:
		ret += int(s[0]) * 60 * 60
		ret += int(s[1]) * 60
		ret += int(s[2])
	elif len(s) == 2:
		ret += int(s[0]) * 60
		ret += int(s[1])
	
	return ret
	
class Theme:
	def __init__(self, episodeFrom, episodeUntil, length = -1, start = 0):
		self.episodeFrom = int(episodeFrom)
		self.episodeUntil = int(episodeUntil)
		self.start = int(start)
		self.length = int(length)
	
main()