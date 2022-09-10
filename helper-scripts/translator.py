#
# Translate our english messages to other languages using DeepL
# 
import deepl, os, re

print ("Automatically translating messages.json files using DeepL")

key = "9d88a7a1-2310-d066-f115-bf9a9b376e23:fx"
translator = deepl.Translator(key)

languages = ["es", "de", "fr"];

def translate(match):
	text = match.group(2)
	if text:
		text = translator.translate_text(text, target_lang=lang).text
	return match.group(1) + '"' + text + '"'

path = "package/_locales/"
if os.path.exists(path):
	f = open(path + "en/messages.json")
	
	original = f.read()
	for lang in languages:
		print ("Creating translation for language: \"" + lang + "\"")
		if not os.path.exists(path + lang):
			os.makedirs(path + lang)
		
		result = re.sub('("message":\s*)"([^"]*)"', translate, original)
		w = open(path + lang + "/messages.json", "w", encoding='utf-8')
		w.write(result)
		w.close()
		
	f.close()
	
	print ("Finished")