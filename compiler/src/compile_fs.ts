/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.

Contains impure functions related to compiling that interact with the filesystem.
*/

import deepmerge from "deepmerge";
import * as fs from "fs";
import path from "path";
import * as yup from "yup";
import { CompilerError } from "./classes.js";
import { compileMlogxToMlog } from "./compile.js";
import { compilerMark } from "./consts.js";
import { Log } from "./Log.js";
import { askQuestion, getCompilerConsts } from "./funcs.js";
import { Settings, settingsSchema } from "./settings.js";
import { PartialRecursive } from "./types.js";

export function compileDirectory(directory:string, stdlibPath:string, defaultSettings:PartialRecursive<Settings>, icons:Map<string, string>){


	const settings = getSettings(directory, defaultSettings);
	const srcDirectoryExists = fs.existsSync(path.join(directory, "src")) && fs.lstatSync(path.join(directory, "src")).isDirectory();

	if(!srcDirectoryExists && settings.compilerOptions.mode == "project"){
		Log.printMessage("compiler mode project but no src directory", {});
		settings.compilerOptions.mode = "single";
	}
	if(srcDirectoryExists){
		settings.compilerOptions.mode = "project";
	}

	const sourceDirectory = settings.compilerOptions.mode == "project" ? path.join(directory, "src") : directory;
	const outputDirectory = settings.compilerOptions.mode == "project" ? path.join(directory, "build") : sourceDirectory;
	const stdlibDirectory = path.join(stdlibPath, "build");


	//If in project mode and build/ doesn't exist, create it
	if(settings.compilerOptions.mode == "project" && !fs.existsSync(outputDirectory)){
		fs.mkdirSync(outputDirectory);
	}

	/**List of filenames ending in .mlogx in the src directory. */
	const mlogxFilelist:string[] = fs.readdirSync(sourceDirectory).filter(filename => filename.match(/\.mlogx$/));
	/**List of filenames ending in .mlog in the src directory. */
	const mlogFilelist:string[] = fs.readdirSync(sourceDirectory).filter(filename => filename.match(/\.mlog$/));
	const stdlibFilelist:string[] = fs.readdirSync(stdlibDirectory).filter(filename => filename.match(/\.mlog/));
	const compiledData: {
		[index: string]: string[];
	} = {};
	let mainData: string[] = [];
	const stdlibData: {
		[index: string]: string[];
	} = {};
	
	Log.printMessage("files to compile", mlogxFilelist);

	for(const filename of stdlibFilelist){
		//For each filename in the stdlib
		// Load the file into stdlibData
		stdlibData[filename.split(".")[0]] = fs.readFileSync(path.join(stdlibDirectory, filename), 'utf-8').split(/\r?\n/g);
	}

	for(const filename of mlogxFilelist){
		//For each filename in the file list

		Log.printMessage("compiling file", {filename});
		const data:string[] = fs.readFileSync(path.join(sourceDirectory, filename), 'utf-8').split(/\r?\n/g);
		//Load the data
		
		let outputData: string[];
		//Compile, but handle errors
		try {
			outputData = compileMlogxToMlog(data,
				{
					...settings,
					filename
				},
				getCompilerConsts(icons, {
					...settings,
					filename
				})
			).outputProgram.map(line => line[0]);
		} catch(err){
			Log.printMessage("compiling file failed", {filename});
			if(err instanceof CompilerError)
				Log.err(err.message);
			else
				Log.dump(err);
			return;
		}
		if(settings.compilerOptions.mode == "single" && !settings.compilerOptions.removeCompilerMark){
			outputData.push("end", ...compilerMark);
		}
		//Write .mlog files to output
		fs.writeFileSync(
			path.join(outputDirectory, filename.slice(0,-1)),
			outputData.join("\r\n")
		);
		if(settings.compilerOptions.mode == "project"){
			//if #program_type is never, then skip saving the compiled data
			if(data.includes("#program_type never")) continue;
			//If the filename is not main, add it to the list of compiled data, otherwise, set mainData to it
			if(filename != "main.mlogx"){
				compiledData[filename] = outputData;
			} else {
				mainData = outputData;
			}
		}
	}

	if(settings.compilerOptions.mode == "project"){
		for(const filename of mlogFilelist){
			//For each filename in the other file list
			//If the filename is not main, add it to the list of compiled data, otherwise, set mainData to it
			if(filename != "main.mlog"){
				compiledData[filename] = fs.readFileSync(`src/${filename}`, 'utf-8').split(/\r?\n/g);
			} else {
				mainData = fs.readFileSync(`src/${filename}`, 'utf-8').split(/\r?\n/g);
			}
		}
		Log.printMessage("assembling output", {});

		const outputData:string[] = [
			...mainData, "end", "",
			"#functions",
			//bizzare hack to use spread operator twice
			...([] as string[]).concat(...
			Object.values(compiledData).map(program => program.concat("end"))
			), "",
			"#stdlib functions",
			...([] as string[]).concat(
				...Object.entries(stdlibData).filter(
					([name]) => settings.compilerOptions.include.includes(name)
				).map(([, program]) => program.concat("end"))
			),
			"", ...(settings.compilerOptions.removeCompilerMark ? compilerMark : [])
		];

		fs.writeFileSync(
			path.join(directory, "out.mlog"),
			outputData.join("\r\n")
		);
	}
	Log.printMessage("compilation complete", {});
}

function getSettings(directory:string, defaultSettings:PartialRecursive<Settings>):Settings {
	try {
		let settings:Settings;
		fs.accessSync(path.join(directory, "config.json"), fs.constants.R_OK);
		const settingsInFile = JSON.parse(fs.readFileSync(path.join(directory, "config.json"), "utf-8"));
		// eslint-disable-next-line prefer-const
		settings = settingsSchema.validateSync(deepmerge(defaultSettings, settingsInFile), {
			stripUnknown: false
		}) as Settings;
		if("compilerVariables" in settings){
			Log.printMessage("settings.compilerVariables deprecated", {});
			settings.compilerConstants = (settings as Settings & {compilerVariables: typeof settings.compilerConstants})["compilerVariables"];
		}
		return settings;
	} catch(err){
		if(err instanceof yup.ValidationError || err instanceof SyntaxError){
			Log.printMessage("invalid config.json", err);
		} else {
			Log.printMessage("no config.json", {});

		}
		return settingsSchema.getDefault() as Settings;
	}
}

export function compileFile(name:string, givenSettings:PartialRecursive<Settings>, icons:Map<string, string>){

	const extension = path.extname(name);
	if(extension == ".mlog"){
		Log.printMessage("cannot compile mlog file", {});
		return;
	}

	const settingsPath = path.join(name, "../config.json");
	if(fs.existsSync(settingsPath)) givenSettings = deepmerge(givenSettings, JSON.parse(fs.readFileSync(settingsPath, "utf-8")));

	const data:string[] = fs.readFileSync(name, 'utf-8').split(/\r?\n/g);
	let outputData:string[];
	const settings = settingsSchema.validateSync({
		filename: name,
		...givenSettings
	}) as Settings;
	try {
		outputData = compileMlogxToMlog(
			data,
			settings,
			getCompilerConsts(icons, settings)
		).outputProgram.map(line => line[0]);
	} catch(err){
		Log.printMessage("compiling file failed", {filename:name});
		if(err instanceof CompilerError){
			Log.err(err.message);
		} else {
			Log.err("Unhandled error:");
			Log.dump(err);
		}
		return;
	}

	fs.writeFileSync(name.slice(0, -1), outputData.join("\r\n"));
}

export async function createProject(name:string|undefined){
	if(!name){
		name = await askQuestion("Project name: ");
	}
	//If the current directory is the same as the path
	if(process.cwd().split(path.sep).at(-1)?.toLowerCase() == name.toLowerCase()){
		name = ".";
	}
	if(fs.existsSync(path.join(process.cwd(), name))){
		throw new Error(`Directory ${name} already exists.`);
	}
	if(/[./\\]/.test(name) && name != "."){
		throw new Error(`Name ${name} contains invalid characters.`);
	}
	const authors:string[] = (await askQuestion("Authors: ")).split(" ");
	const isSingleFiles = await askQuestion("Single files [y/n]:");
	fs.mkdirSync(path.join(process.cwd(), name));
	if(!isSingleFiles) fs.mkdirSync(path.join(process.cwd(), name, "src"));
	fs.writeFileSync(path.join(process.cwd(), name, "config.json"), JSON.stringify(settingsSchema.validateSync({
		name,
		authors,
		compilerOptions: {
			mode: isSingleFiles ? "single" : "project"
		}
	}), null, "\t"), "utf-8");
	Log.printMessage("project created", {dirname: path.join(process.cwd(), name)});
	return true;
}

