#
# Creates (or adds to) our timestamps database by scraping a few websites
# 
import requests, json, re
from bs4 import BeautifulSoup

debug = True

def main():
	result = {}
	print ("Starting scraping")
	with open('../package/timestamps.json', 'r') as f:
		result = json.load(f)

	print ("\tScraping opwiki.org for OnePiece")
	# OnePiece has AID of 69
	page = requests.get("https://opwiki.org/wiki/Openings_&_Endings")
	soup = BeautifulSoup(page.content, "html.parser")
	# intros
	intros = []
	intros.append(Theme(284, 396, 36))
	intros.append(Theme(397, 516, 47))
	intros.append(Theme(523, 752, 40))
	intros.append(Theme(753, 803, 62))
	intros.append(Theme(879, 890, 51))

	# openings
	openings = []
	so = soup.find(id="Openings")
	t = so.find_next_sibling("table")
	for tr in t.find_all("tr"):
		if len(tr.contents) == 6:
			text = ""
			for s in tr.contents[5].stripped_strings:
				text += s
			
			f = re.findall("(\d*)-(\d*)", text)
			if len(f) > 0:
				for x in f:
					if len(x) == 2:
						# Get length
						length = getLength("https://opwiki.org" + tr.contents[1].find("a")["href"])
						
						th = Theme(x[0], x[1], length, 14)
						openings.append(th)
			
			else:
				x = re.search("abEpisode (\d*)", text) # becase stripped strings are wierd
				if x != None and len(x.groups()) == 1:
					# Get length
					length = getLength("https://opwiki.org" + tr.contents[1].find("a")["href"])
					
					th = Theme(x.group(1), int(x.group(1)) + 100, length, 14)
					openings.append(th)
				else:
					x = re.search("Episode (\d*)", text)
					if x != None and len(x.groups()) == 1:
						# Get length
						length = getLength("https://opwiki.org" + tr.contents[1].find("a")["href"])
						
						th = Theme(x.group(1), x.group(1), length, 14)
						openings.append(th)
	
	# endings
	endings = []
	so = soup.find(id="Endings")
	t = so.find_next_sibling("table")
	for tr in t.find_all("tr"):
		if len(tr.contents) == 4:
			text = ""
			for s in tr.contents[3].stripped_strings:
				text += s
			
			f = re.findall("(\d*)-(\d*)", text)
			if len(f) > 0:
				for x in f:
					if len(x) == 2:
						# Get length
						length = getLength("https://opwiki.org" + tr.contents[1].find("a")["href"])
						
						th = Theme(x[0], x[1], length)
						endings.append(th)
			
			else:
				x = re.search("abEpisode (\d*)", text) # because stripped strings are wierd
				if x != None and len(x.groups()) == 1:
					# Get length
					length = getLength("https://opwiki.org" + tr.contents[1].find("a")["href"])
					
					th = Theme(x.group(1), int(x.group(1)) + 100, length)
					endings.append(th)
				else:
					x = re.search("Episode (\d*)", text)
					if x != None and len(x.groups()) == 1:
						# Get length
						length = getLength("https://opwiki.org" + tr.contents[1].find("a")["href"])
						
						th = Theme(x.group(1), x.group(1), length)
						endings.append(th)
	
	# OnePiece always shows 40 seconds of preview at the endswith
	previews = [Theme(1, 1100, 40)]

	result["69"] = combine(intros, openings, endings, previews)
	print ("\tFinished OnePiece");


	print ("Finished scraping. Writing results to parseResults.json")
	f = open("parseResults.json", "w")
	f.write(json.dumps(result, indent=4))
	f.close()

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
	
def getLength(url):
	if debug:
		print("Getting length from " + url)
		
	page = requests.get(url)
	soup = BeautifulSoup(page.content, "html.parser")
	
	res = soup.find(string="Dauer:").parent.parent.next_sibling.string
	return parseTime(res)
	
def combine(intros, openings, endings, previews):
	ret = {}
	maxEp = 0
	
	prevValue = {}
	
	zoneBeginning = 0
	
	for o in openings:
		maxEp = max(maxEp, o.episodeUntil)
	
	for x in range(1, maxEp):
		e = createEpisode(x, intros, openings, endings, previews)
		if e != prevValue:
			if zoneBeginning != 0:
				ret["episodes " + str(zoneBeginning) + "-" + str(x - 1)] = prevValue
			zoneBeginning = x
		prevValue = e
		
		if x == maxEp:
			ret["episodes " + str(zoneBeginning) + "-" + str(x - 1)] = prevValue
		
	return ret
	
def createEpisode(episode, intros, openings, endings, previews):
	ret = {}
	
	ep = int(episode)
	
	for o in openings:
		if o.episodeFrom <= ep and o.episodeUntil >= ep:
			ret["opening"] = {
				"start": o.start,	
				"length": o.length
			}
			for i in intros:
				if i.episodeFrom <= ep and i.episodeUntil >= ep:
					ret["intro"] = {
						"start": o.length,
						"length": i.length
					}
					break
			break
			
	for e in endings:
		if e.episodeFrom <= ep and e.episodeUntil >= ep:
			ret["ending"] = {
				"length": e.length
			}
			
	for p in previews:
		if p.episodeFrom <= ep and p.episodeUntil >= ep:
			ret["preview"] = {
				"length": p.length
			}
	
	return ret

class Theme:
	def __init__(self, episodeFrom, episodeUntil, length = -1, start = 0):
		self.episodeFrom = int(episodeFrom)
		self.episodeUntil = int(episodeUntil)
		self.start = int(start)
		self.length = int(length)

main()

