#
# Translate our english messages to other languages using DeepL
# 
import deepl, os, re, requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
load_dotenv()

path = "../package/_locales/"
translator = deepl.Translator(os.getenv("DEEPL_KEY"))

def main():
	print ("Automatically translating messages.json files using DeepL")

	# all available languages
	languages = ["bg", "cs", "da", "de", "el", "es", "et", "fi", "fr", "hu", "id", "it", "ja", "lt", "lv", "nl", "pl", "pt-pt", "pt-br", "ro", "ru", "sk", "sl", "sv", "tr", "uk", "zh"];
	
	#languages = ["de"] # just for testing
	
	if os.path.exists(path):
		f = open(path + "en/messages.json")
		
		original = f.read()
		for lang in languages:

			def translate(match):
				text = match.group(2)
				if text:
					if (lang == "de" or lang == "fr" or lang == "it" or lang == "es" or lang == "nl" or lang == "pl" or lang == "pt"  or lang == "ru"):
						text = translator.translate_text(text, target_lang=lang, formality="less").text
					else:
						text = translator.translate_text(text, target_lang=lang).text
				return match.group(1) + '"' + text + '"'
				
			print ("Creating translation for language: \"" + lang + "\"")
			if not os.path.exists(path + lang):
				os.makedirs(path + lang)
			
			result = re.sub('("message":\s*)"([^"]*)"', translate, original)
			w = open(path + lang + "/messages.json", "w", encoding='utf-8')
			w.write(result)
			w.close()
			
		f.close()
		
		print ("Finished")

	
main()