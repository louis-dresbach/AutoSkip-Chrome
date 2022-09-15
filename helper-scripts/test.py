
import requests, json, re, os
from bs4 import BeautifulSoup
def main():
	title = "Chobits"
	domain = "https://9anime.id"
	page = requests.get(domain + "/filter?keyword=" + title)
	soup = BeautifulSoup(page.content, "html.parser")
	
	res = soup.find_all("a", class_="name d-title");
	for link in res:
		if title == link.string:
			page = requests.get("https://9anime.id" + link["href"])
			soup = BeautifulSoup(page.content, "html.parser")
			print(soup)

main()